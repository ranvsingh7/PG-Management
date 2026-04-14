import MeterReading from './meter-reading.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  owner_account_id: ownerAccountId
});

export const createMeterReading = async (payload) => {
  const created = await MeterReading.create(payload);
  return created.toJSON();
};

export const getMeterReadings = async (ownerAccountId, filters = {}) => {
  const query = {
    ...ownerScopeQuery(ownerAccountId)
  };

  if (filters.building_id) {
    query.building_id = filters.building_id;
  }

  if (filters.room_number) {
    query.room_number = filters.room_number;
  }

  if (filters.tenant_id) {
    query.tenant_id = filters.tenant_id;
  }

  if (filters.reading_type) {
    query.reading_type = filters.reading_type;
  }

  if (filters.period) {
    query.period = filters.period;
  }

  return MeterReading.find(query).lean();
};

export const getCheckInReadingForTenant = async (ownerAccountId, tenantId) =>
  MeterReading.findOne({
    ...ownerScopeQuery(ownerAccountId),
    tenant_id: tenantId,
    reading_type: 'check_in'
  }).lean();

export const getMonthEndReading = async (ownerAccountId, buildingId, roomNumber, period) =>
  MeterReading.findOne({
    ...ownerScopeQuery(ownerAccountId),
    building_id: buildingId,
    room_number: roomNumber,
    period,
    reading_type: 'month_end'
  })
    .sort({ reading_date: -1 })
    .lean();

export const getLatestReadingBeforeDate = async (ownerAccountId, buildingId, roomNumber, beforeDate) => {
  const query = {
    ...ownerScopeQuery(ownerAccountId),
    building_id: buildingId,
    room_number: roomNumber
  };

  if (beforeDate) {
    query.reading_date = { $lt: beforeDate };
  }

  return MeterReading.findOne(query).sort({ reading_date: -1 }).lean();
};

export const upsertMonthEndReading = async (ownerAccountId, buildingId, roomNumber, period, payload) => {
  const updated = await MeterReading.findOneAndUpdate(
    {
      ...ownerScopeQuery(ownerAccountId),
      building_id: buildingId,
      room_number: roomNumber,
      period,
      reading_type: 'month_end'
    },
    { ...payload, updated_at: new Date() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return updated ? updated.toJSON() : null;
};

