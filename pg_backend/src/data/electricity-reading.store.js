import ElectricityReading from "../models/electricity-reading.model.js";

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getReadingsForBuildingAndRange = async (buildingId, ownerAccountId, startDate, endDate) =>
  ElectricityReading.find({
    building_id: buildingId,
    reading_at: { $gte: startDate, $lte: endDate },
    ...ownerScopeQuery(ownerAccountId)
  }).lean();

export const getReadingsForRoomAndRange = async (buildingId, roomNumber, ownerAccountId, startDate, endDate) =>
  ElectricityReading.find({
    building_id: buildingId,
    room_number: roomNumber,
    reading_at: { $gte: startDate, $lte: endDate },
    ...ownerScopeQuery(ownerAccountId)
  }).lean();

export const getLatestReadingBeforeDate = async (buildingId, roomNumber, ownerAccountId, beforeDate) =>
  ElectricityReading.findOne({
    building_id: buildingId,
    room_number: roomNumber,
    reading_at: { $lt: beforeDate },
    ...ownerScopeQuery(ownerAccountId)
  })
    .sort({ reading_at: -1 })
    .lean();

export const getMonthEndReadingForRange = async (buildingId, roomNumber, ownerAccountId, startDate, endDate) =>
  ElectricityReading.findOne({
    building_id: buildingId,
    room_number: roomNumber,
    reading_type: "month_end",
    reading_at: { $gte: startDate, $lte: endDate },
    ...ownerScopeQuery(ownerAccountId)
  })
    .sort({ reading_at: -1 })
    .lean();

export const createElectricityReading = async (reading) => {
  const created = await ElectricityReading.create(reading);
  return created.toJSON();
};

export const updateElectricityReadingById = async (id, ownerAccountId, reading) => {
  const updated = await ElectricityReading.findOneAndUpdate(
    { id, ...ownerScopeQuery(ownerAccountId) },
    reading,
    { new: true, runValidators: true }
  );

  return updated ? updated.toJSON() : null;
};
