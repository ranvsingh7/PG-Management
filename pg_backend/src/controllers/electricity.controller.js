import { v4 as uuidv4 } from "uuid";
import { getBuildingById } from "../data/building.store.js";
import { getRoomsByBuildingId } from "../data/room.store.js";
import { getAllTenants, getTenantById } from "../data/tenant.store.js";
import {
  createElectricityReading,
  getLatestReadingBeforeDate,
  getMonthEndReadingForRange,
  getReadingsForBuildingAndRange,
  getReadingsForRoomAndRange,
  updateElectricityReadingById
} from "../data/electricity-reading.store.js";
import { parseMonth, buildTenantIntervals, buildRoomSummary } from "../services/electricity-billing.js";

export const getElectricitySummaryHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || "admin";
    const buildingId = String(req.query.building_id || "").trim();
    const month = parseMonth(String(req.query.month || ""));

    if (!buildingId || !month) {
      return res.status(400).json({ message: "building_id and month are required (YYYY-MM)." });
    }

    const building = await getBuildingById(buildingId, ownerAccountId);
    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    const [rooms, tenants, readingsInMonth] = await Promise.all([
      getRoomsByBuildingId(buildingId, ownerAccountId),
      getAllTenants(ownerAccountId),
      getReadingsForBuildingAndRange(buildingId, ownerAccountId, month.start, month.end)
    ]);

    const summaries = await Promise.all(
      rooms.map(async (room) => {
        const baselineReading = await getLatestReadingBeforeDate(
          buildingId,
          room.room_number,
          ownerAccountId,
          month.start
        );
        const monthEndReading = await getMonthEndReadingForRange(
          buildingId,
          room.room_number,
          ownerAccountId,
          month.start,
          month.end
        );

        const roomReadings = readingsInMonth.filter((reading) => reading.room_number === room.room_number);
        const tenantIntervals = buildTenantIntervals(tenants, buildingId, room.room_number);
        const rate = Number(building.electricity_rate || 0);

        return buildRoomSummary({
          room,
          buildingId,
          monthStart: month.start,
          monthEnd: month.end,
          rate,
          roomReadings,
          baselineReading,
          monthEndReading,
          tenantIntervals
        });
      })
    );

    return res.status(200).json({
      building: {
        id: building.id,
        name: building.name,
        electricity_rate: Number(building.electricity_rate || 0)
      },
      month: month.value,
      rooms: summaries
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load electricity summary", error: error.message });
  }
};

export const upsertMonthEndReadingsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || "admin";
    const buildingId = String(req.body?.building_id || "").trim();
    const month = parseMonth(String(req.body?.month || ""));
    const readings = Array.isArray(req.body?.readings) ? req.body.readings : [];

    if (!buildingId || !month) {
      return res.status(400).json({ message: "building_id and month are required (YYYY-MM)." });
    }

    if (!readings.length) {
      return res.status(400).json({ message: "Please provide readings." });
    }

    const building = await getBuildingById(buildingId, ownerAccountId);
    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    const saved = [];

    for (const entry of readings) {
      const roomNumber = String(entry.room_number || "").trim();
      const readingValue = Number(entry.reading);

      if (!roomNumber) {
        continue;
      }
      if (!Number.isFinite(readingValue) || readingValue < 0) {
        return res.status(400).json({ message: `Invalid reading for room ${roomNumber}.` });
      }

      const monthEndReading = await getMonthEndReadingForRange(
        buildingId,
        roomNumber,
        ownerAccountId,
        month.start,
        month.end
      );

      const lastBefore = await getLatestReadingBeforeDate(
        buildingId,
        roomNumber,
        ownerAccountId,
        month.end
      );

      if (lastBefore && Number(readingValue) < Number(lastBefore.reading)) {
        return res
          .status(400)
          .json({ message: `Reading for room ${roomNumber} cannot be lower than previous reading.` });
      }

      const payload = {
        building_id: buildingId,
        room_number: roomNumber,
        reading: Number(readingValue.toFixed(2)),
        reading_at: month.end,
        reading_type: "month_end",
        owner_account_id: ownerAccountId,
        created_by: req.admin?.id || "admin",
        created_at: new Date()
      };

      if (monthEndReading) {
        const updated = await updateElectricityReadingById(monthEndReading.id, ownerAccountId, payload);
        if (updated) {
          saved.push(updated);
        }
      } else {
        const created = await createElectricityReading({ id: uuidv4(), ...payload });
        saved.push(created);
      }
    }

    return res.status(200).json({ saved });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save readings", error: error.message });
  }
};

export const getTenantElectricityHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId || tenantId;
    const month = parseMonth(String(req.query.month || "")) || parseMonth(new Date().toISOString().slice(0, 7));

    if (!tenantId || !month) {
      return res.status(400).json({ message: "Tenant or month not found." });
    }

    const tenant = await getTenantById(tenantId, ownerAccountId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found." });
    }

    const building = await getBuildingById(tenant.building_id, ownerAccountId);
    if (!building) {
      return res.status(404).json({ message: "Building not found." });
    }

    const [room, tenants, readingsInMonth, baselineReading, monthEndReading] = await Promise.all([
      getRoomsByBuildingId(tenant.building_id, ownerAccountId).then((rooms) =>
        rooms.find((row) => row.room_number === tenant.room_number)
      ),
      getAllTenants(ownerAccountId),
      getReadingsForRoomAndRange(tenant.building_id, tenant.room_number, ownerAccountId, month.start, month.end),
      getLatestReadingBeforeDate(tenant.building_id, tenant.room_number, ownerAccountId, month.start),
      getMonthEndReadingForRange(tenant.building_id, tenant.room_number, ownerAccountId, month.start, month.end)
    ]);

    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    const tenantIntervals = buildTenantIntervals(tenants, tenant.building_id, tenant.room_number);
    const summary = buildRoomSummary({
      room,
      buildingId: tenant.building_id,
      monthStart: month.start,
      monthEnd: month.end,
      rate: Number(building.electricity_rate || 0),
      roomReadings: readingsInMonth,
      baselineReading,
      monthEndReading,
      tenantIntervals
    });

    const tenantAllocation = summary.allocations.find((entry) => entry.tenant_id === tenantId) || null;

    return res.status(200).json({
      month: month.value,
      building: { id: building.id, name: building.name },
      room: { id: room.id, room_number: room.room_number, capacity: room.capacity },
      rate_per_unit: Number(building.electricity_rate || 0),
      total_units: summary.units,
      total_amount: summary.total_amount,
      tenant_allocation: tenantAllocation,
      status: summary.status,
      unallocated_units: summary.unallocated_units
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load tenant electricity", error: error.message });
  }
};
