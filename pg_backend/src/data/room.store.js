import Room from '../models/room.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getAllRooms = async (ownerAccountId) =>
  Room.find(ownerScopeQuery(ownerAccountId)).lean();

export const getRoomsByBuildingId = async (buildingId, ownerAccountId) =>
  Room.find({ building_id: buildingId, ...ownerScopeQuery(ownerAccountId) }).lean();

export const getRoomById = async (id, ownerAccountId) =>
  Room.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const getRoomByBuildingAndRoomNumber = async (buildingId, roomNumber, ownerAccountId) =>
  Room.findOne({ building_id: buildingId, room_number: roomNumber, ...ownerScopeQuery(ownerAccountId) }).lean();

export const createRoom = async (room) => {
  const created = await Room.create(room);
  return created.toJSON();
};

export const updateRoom = async (id, ownerAccountId, room) => {
  const updated = await Room.findOneAndUpdate({ id, ...ownerScopeQuery(ownerAccountId) }, room, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};

export const deleteRoom = async (id, ownerAccountId) => {
  const deleted = await Room.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};
