import { v4 as uuidv4 } from 'uuid';
import { getOrCreateSetting } from '../setting/setting.store.js';
import { getAllTenants, getTenantById } from '../tenant/tenant.store.js';
import { getRoomsByBuildingId } from '../room/room.store.js';
import {
  createMeterReading,
  getCheckInReadingForTenant,
  getLatestReadingBeforeDate,
  getMeterReadings,
  getMonthEndReading,
  upsertMonthEndReading
} from './meter-reading.store.js';

const toMonthKey = (date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const parsePeriod = (value) => {
  const period = value || toMonthKey();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    return null;
  }

  const [yearStr, monthStr] = period.split('-');
  return {
    value: period,
    year: Number(yearStr),
    month: Number(monthStr)
  };
};

const toStartOfDayTs = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const isTenantActiveInPeriod = (tenant, periodFromTs, periodToTs) => {
  const checkInTs = toStartOfDayTs(tenant.check_in_date);
  if (checkInTs === null || checkInTs > periodToTs) {
    return false;
  }

  if (!tenant.check_out_date) {
    return true;
  }

  const checkOutTs = toStartOfDayTs(tenant.check_out_date);
  if (checkOutTs === null) {
    return true;
  }

  return checkOutTs > periodFromTs;
};

const getOccupancyDays = (tenant, periodFromTs, periodToTs) => {
  const checkInTs = toStartOfDayTs(tenant.check_in_date);
  if (checkInTs === null) {
    return 0;
  }

  let checkOutTs = periodToTs;
  if (tenant.check_out_date) {
    const parsedOut = toStartOfDayTs(tenant.check_out_date);
    if (parsedOut !== null) {
      checkOutTs = parsedOut;
    }
  }

  const effectiveStart = Math.max(checkInTs, periodFromTs);
  const effectiveEnd = Math.min(checkOutTs, periodToTs);

  if (effectiveEnd < effectiveStart) {
    return 0;
  }

  return Math.floor((effectiveEnd - effectiveStart) / DAY_MS) + 1;
};

const splitUnitsAcrossTenants = ({ units, rate, occupants }) => {
  if (!Number.isFinite(units) || units <= 0 || !occupants.length) {
    return occupants.map((entry) => ({ ...entry, units_consumed: 0, amount: 0 }));
  }

  const totalDays = occupants.reduce((sum, entry) => sum + entry.occupancy_days, 0);
  if (totalDays <= 0) {
    return occupants.map((entry) => ({ ...entry, units_consumed: 0, amount: 0 }));
  }

  const totalAmount = Number((units * rate).toFixed(2));
  let remainingUnits = Number(units.toFixed(2));
  let remainingAmount = totalAmount;

  return occupants.map((entry, index) => {
    if (index === occupants.length - 1) {
      const finalUnits = Number(remainingUnits.toFixed(2));
      const finalAmount = Number(remainingAmount.toFixed(2));
      return { ...entry, units_consumed: finalUnits, amount: finalAmount };
    }

    const shareUnits = Number(((units * entry.occupancy_days) / totalDays).toFixed(2));
    const shareAmount = Number((shareUnits * rate).toFixed(2));

    remainingUnits = Number((remainingUnits - shareUnits).toFixed(2));
    remainingAmount = Number((remainingAmount - shareAmount).toFixed(2));

    return { ...entry, units_consumed: shareUnits, amount: shareAmount };
  });
};

const getPeriodBoundaries = (parsedPeriod) => {
  const periodFromTs = Date.UTC(parsedPeriod.year, parsedPeriod.month - 1, 1, 0, 0, 0, 0);
  const periodToTs = Date.UTC(parsedPeriod.year, parsedPeriod.month, 0, 23, 59, 59, 999);
  return { periodFromTs, periodToTs };
};

const toUtcDate = (value, fallback) => {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return fallback;
};

const buildPeriodEndDate = (parsedPeriod) =>
  new Date(Date.UTC(parsedPeriod.year, parsedPeriod.month, 0, 23, 59, 59, 999));

export const getElectricityRate = async (ownerAccountId) => {
  const setting = await getOrCreateSetting(ownerAccountId);
  const rate = Number(setting?.electricity_rate_per_unit || 0);
  return {
    rate: Number.isFinite(rate) && rate >= 0 ? rate : 0,
    unit_label: String(setting?.electricity_unit_label || 'kWh')
  };
};

export const recordCheckInReading = async ({ ownerAccountId, tenant, readingValue, readingDate, createdBy }) => {
  if (!tenant || !tenant.id) {
    return null;
  }

  if (!Number.isFinite(readingValue) || readingValue < 0) {
    return null;
  }

  const existing = await getCheckInReadingForTenant(ownerAccountId, tenant.id);
  if (existing) {
    return existing;
  }

  const parsedDate = toUtcDate(readingDate, new Date());

  return createMeterReading({
    id: uuidv4(),
    owner_account_id: ownerAccountId,
    building_id: tenant.building_id,
    room_number: tenant.room_number,
    tenant_id: tenant.id,
    reading_type: 'check_in',
    period: null,
    reading_value: Number(readingValue),
    reading_date: parsedDate,
    note: 'Check-in reading',
    created_by: createdBy || 'admin',
    created_at: new Date(),
    updated_at: null
  });
};

export const recordMonthEndReading = async ({
  ownerAccountId,
  buildingId,
  roomNumber,
  tenantId,
  period,
  readingValue,
  readingDate,
  createdBy
}) => {
  const parsedPeriod = parsePeriod(period);
  if (!parsedPeriod) {
    return { error: 'period must be in YYYY-MM format' };
  }

  if (!Number.isFinite(readingValue) || readingValue < 0) {
    return { error: 'reading_value must be a non-negative number' };
  }

  const periodEnd = buildPeriodEndDate(parsedPeriod);
  const parsedDate = toUtcDate(readingDate, periodEnd);

  const existing = await getMonthEndReading(ownerAccountId, buildingId, roomNumber, parsedPeriod.value);
  const nextId = existing?.id || uuidv4();

  const record = await upsertMonthEndReading(ownerAccountId, buildingId, roomNumber, parsedPeriod.value, {
    id: nextId,
    owner_account_id: ownerAccountId,
    building_id: buildingId,
    room_number: roomNumber,
    tenant_id: tenantId || null,
    reading_type: 'month_end',
    period: parsedPeriod.value,
    reading_value: Number(readingValue),
    reading_date: parsedDate,
    note: 'Month-end reading',
    created_by: createdBy || existing?.created_by || 'admin',
    created_at: existing?.created_at || new Date()
  });

  return { record };
};

export const getElectricitySummary = async ({ ownerAccountId, buildingId, period }) => {
  const parsedPeriod = parsePeriod(period);
  if (!parsedPeriod) {
    return { error: 'period must be in YYYY-MM format' };
  }

  if (!buildingId) {
    return { error: 'building_id is required' };
  }

  const [{ rate, unit_label }, rooms, tenants, readings] = await Promise.all([
    getElectricityRate(ownerAccountId),
    getRoomsByBuildingId(buildingId, ownerAccountId),
    getAllTenants(ownerAccountId),
    getMeterReadings(ownerAccountId, { building_id: buildingId })
  ]);

  const { periodFromTs, periodToTs } = getPeriodBoundaries(parsedPeriod);

  const activeTenants = tenants.filter(
    (tenant) =>
      tenant.status === 'active' &&
      tenant.building_id === buildingId &&
      isTenantActiveInPeriod(tenant, periodFromTs, periodToTs)
  );

  const tenantsByRoom = new Map();
  activeTenants.forEach((tenant) => {
    const key = tenant.room_number;
    const entry = tenantsByRoom.get(key) || [];
    entry.push(tenant);
    tenantsByRoom.set(key, entry);
  });

  const readingsByRoom = new Map();
  readings.forEach((reading) => {
    const key = reading.room_number;
    const list = readingsByRoom.get(key) || [];
    list.push(reading);
    readingsByRoom.set(key, list);
  });

  const checkInReadingsByTenant = new Map(
    readings
      .filter((reading) => reading.reading_type === 'check_in' && reading.tenant_id)
      .map((reading) => [reading.tenant_id, Number(reading.reading_value || 0)])
  );

  readingsByRoom.forEach((list) => {
    list.sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime());
  });

  const items = rooms.map((room) => {
    const roomReadings = readingsByRoom.get(room.room_number) || [];
    const monthEndCandidates = roomReadings.filter(
      (reading) => reading.reading_type === 'month_end' && reading.period === parsedPeriod.value
    );

    const monthEndReading = monthEndCandidates.length
      ? monthEndCandidates[monthEndCandidates.length - 1]
      : null;

    const cutoffTs = monthEndReading
      ? new Date(monthEndReading.reading_date).getTime()
      : periodToTs;

    let previous = null;
    for (let i = roomReadings.length - 1; i >= 0; i -= 1) {
      const candidate = roomReadings[i];
      const candidateTs = new Date(candidate.reading_date).getTime();
      if (candidateTs < cutoffTs) {
        previous = candidate;
        break;
      }
    }

    const previousValue = previous ? Number(previous.reading_value || 0) : 0;
    const currentValue = monthEndReading ? Number(monthEndReading.reading_value || 0) : null;
    const units = currentValue === null ? null : Math.max(currentValue - previousValue, 0);
    const amount = currentValue === null ? 0 : Number((units * rate).toFixed(2));

    const roomTenants = tenantsByRoom.get(room.room_number) || [];
    const occupancyEntries = roomTenants
      .map((tenant) => ({
        tenant,
        occupancy_days: getOccupancyDays(tenant, periodFromTs, periodToTs)
      }))
      .filter((entry) => entry.occupancy_days > 0);

    const allocations = splitUnitsAcrossTenants({
      units: units ?? 0,
      rate,
      occupants: occupancyEntries.map((entry) => ({
        tenant_id: entry.tenant.id,
        tenant_name: entry.tenant.name,
        check_in_date: entry.tenant.check_in_date,
        check_out_date: entry.tenant.check_out_date || null,
        occupancy_days: entry.occupancy_days,
        check_in_reading: checkInReadingsByTenant.get(entry.tenant.id) ?? null,
        units_consumed: 0,
        amount: 0
      }))
    });

    return {
      room_number: room.room_number,
      room_id: room.id,
      tenant_names: roomTenants.map((tenant) => tenant.name),
      tenant_ids: roomTenants.map((tenant) => tenant.id),
      previous_reading: previousValue,
      current_reading: currentValue,
      reading_id: monthEndReading?.id || null,
      reading_date: monthEndReading?.reading_date || null,
      units_consumed: units,
      rate_per_unit: rate,
      amount,
      status: currentValue === null ? 'pending' : 'recorded',
      allocations
    };
  });

  const summary = items.reduce(
    (acc, item) => {
      if (item.units_consumed !== null) {
        acc.total_units += item.units_consumed;
      }
      acc.total_amount += Number(item.amount || 0);
      if (item.status === 'recorded') {
        acc.rooms_recorded += 1;
      } else {
        acc.rooms_pending += 1;
      }
      return acc;
    },
    { total_units: 0, total_amount: 0, rooms_recorded: 0, rooms_pending: 0 }
  );

  summary.total_units = Number(summary.total_units.toFixed(2));
  summary.total_amount = Number(summary.total_amount.toFixed(2));

  return {
    period: parsedPeriod.value,
    unit_label,
    rate_per_unit: rate,
    items,
    summary
  };
};

export const calculateElectricityChargeForTenant = async ({ ownerAccountId, tenant, period }) => {
  if (!tenant || !tenant.building_id || !tenant.room_number) {
    return { amount: 0, units: 0, rate: 0, unit_label: 'kWh' };
  }

  const parsedPeriod = parsePeriod(period);
  if (!parsedPeriod) {
    return { amount: 0, units: 0, rate: 0, unit_label: 'kWh' };
  }

  const { rate, unit_label } = await getElectricityRate(ownerAccountId);
  if (!Number.isFinite(rate) || rate <= 0) {
    return { amount: 0, units: 0, rate, unit_label };
  }

  const monthEndReading = await getMonthEndReading(ownerAccountId, tenant.building_id, tenant.room_number, parsedPeriod.value);
  if (!monthEndReading) {
    return { amount: 0, units: 0, rate, unit_label };
  }

  const { periodFromTs, periodToTs } = getPeriodBoundaries(parsedPeriod);
  const allTenants = await getAllTenants(ownerAccountId);
  const roomTenants = allTenants.filter(
    (entry) =>
      entry.status === 'active' &&
      entry.building_id === tenant.building_id &&
      entry.room_number === tenant.room_number &&
      isTenantActiveInPeriod(entry, periodFromTs, periodToTs)
  );

  const previous = await getLatestReadingBeforeDate(
    ownerAccountId,
    tenant.building_id,
    tenant.room_number,
    monthEndReading.reading_date
  );

  const previousValue = previous ? Number(previous.reading_value || 0) : 0;
  const currentValue = Number(monthEndReading.reading_value || 0);
  const units = Math.max(currentValue - previousValue, 0);

  const occupancyEntries = roomTenants
    .map((entry) => ({
      tenant: entry,
      occupancy_days: getOccupancyDays(entry, periodFromTs, periodToTs)
    }))
    .filter((entry) => entry.occupancy_days > 0);

  const allocations = splitUnitsAcrossTenants({
    units,
    rate,
    occupants: occupancyEntries.map((entry) => ({
      tenant_id: entry.tenant.id,
      tenant_name: entry.tenant.name,
      check_in_date: entry.tenant.check_in_date,
      check_out_date: entry.tenant.check_out_date || null,
      occupancy_days: entry.occupancy_days,
      check_in_reading: null,
      units_consumed: 0,
      amount: 0
    }))
  });

  const tenantAllocation = allocations.find((entry) => entry.tenant_id === tenant.id);
  const allocatedUnits = Number(tenantAllocation?.units_consumed || 0);
  const allocatedAmount = Number(tenantAllocation?.amount || 0);

  return {
    amount: allocatedAmount,
    units: allocatedUnits,
    rate,
    unit_label,
    previous_reading: previousValue,
    current_reading: currentValue,
    reading_id: monthEndReading.id || null
  };
};

export const resolveTenantForCheckInReading = async ({ ownerAccountId, tenantId }) => {
  if (!tenantId) {
    return null;
  }

  const tenant = await getTenantById(tenantId, ownerAccountId);
  return tenant || null;
};

