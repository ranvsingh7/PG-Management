import { v4 as uuidv4 } from 'uuid';
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomByBuildingAndRoomNumber,
  getRoomById,
  updateRoom
} from './room.store.js';
import { getAllTenants } from '../tenant/tenant.store.js';
import { allowedInputFields, validateRoomPayload } from '../../validators/room.validator.js';

const nowIso = () => new Date().toISOString();

const pickAllowedInputFields = (payload) => {
  const picked = {};

  allowedInputFields.forEach((field) => {
    if (payload[field] !== undefined) {
      picked[field] = payload[field];
    }
  });

  return picked;
};

const normalizeRoomForCreate = (payload, createdBy) => {
  const base = {
    id: uuidv4(),
    building_id: payload.building_id,
    room_number: payload.room_number,
    floor: payload.floor,
    type: payload.type.toLowerCase(),
    capacity: payload.capacity,
      electricity_reading: payload.electricity_reading ?? 0,
    occupied: payload.occupied ?? 0,
    pre_booked: payload.pre_booked ?? 0,
    rent: 0,
    status: payload.status.toLowerCase(),
    owner_account_id: createdBy,
    created_by: createdBy,
    created_at: nowIso(),
    pre_bookings: [],
    pre_bookings_count: 0
  };

  return base;
};

const normalizeRoomForUpdate = (existing, payload, updatedBy) => ({
  ...existing,
  ...payload,
  id: existing.id,
  created_at: existing.created_at,
  updated_by: updatedBy,
  updated_at: nowIso()
});

const buildRoomKey = (buildingId, roomNumber) => `${buildingId}::${roomNumber}`;

const computeRoomStatus = ({ occupied, capacity, preBooked }) => {
  if (occupied >= capacity && capacity > 0) {
    return 'occupied';
  }

  if (occupied > 0) {
    return 'partially_occupied';
  }

  if (preBooked > 0) {
    return 'pre_booked';
  }

  return 'vacant';
};

const enrichRoomsWithLiveStats = (rooms, tenants) => {
  const roomStats = new Map();

  tenants
    .filter((tenant) => tenant.status === 'active')
    .forEach((tenant) => {
      const key = buildRoomKey(tenant.building_id, tenant.room_number);
      const current = roomStats.get(key) || { occupied: 0, rent: 0 };

      roomStats.set(key, {
        occupied: current.occupied + 1,
        rent: current.rent + Number(tenant.rent || 0)
      });
    });

  return rooms.map((room) => {
    const key = buildRoomKey(room.building_id, room.room_number);
    const stats = roomStats.get(key) || { occupied: 0, rent: 0 };
    const capacity = Number(room.capacity || 0);
    const preBooked = Number(room.pre_booked || 0);

    return {
      ...room,
      occupied: stats.occupied,
      rent: stats.rent,
      status: computeRoomStatus({
        occupied: stats.occupied,
        capacity,
        preBooked
      })
    };
  });
};

export const createRoomHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const errors = validateRoomPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const input = pickAllowedInputFields(req.body);

    const duplicateRoom = await getRoomByBuildingAndRoomNumber(
      input.building_id,
      input.room_number,
      ownerAccountId
    );

    if (duplicateRoom) {
      return res.status(400).json({
        message: `Room number ${input.room_number} already exists in this building`
      });
    }

    const room = normalizeRoomForCreate(input, ownerAccountId);
    const created = await createRoom(room);

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create room', error: error.message });
  }
};

export const getAllRoomsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const [rooms, tenants] = await Promise.all([
      getAllRooms(ownerAccountId),
      getAllTenants(ownerAccountId)
    ]);

    const enrichedRooms = enrichRoomsWithLiveStats(rooms, tenants);

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 0);
    const search = String(req.query.search || '').trim().toLowerCase();

    let filtered = enrichedRooms;

    if (search) {
      filtered = enrichedRooms.filter((room) => {
        const roomNumber = String(room.room_number || '').toLowerCase();
        const type = String(room.type || '').toLowerCase();
        const status = String(room.status || '').toLowerCase();
        return roomNumber.includes(search) || type.includes(search) || status.includes(search);
      });
    }

    if (Number.isFinite(limit) && limit > 0) {
      const safePage = Number.isFinite(page) && page > 0 ? page : 1;
      const start = (safePage - 1) * limit;
      const items = filtered.slice(start, start + limit);
      const total = filtered.length;
      const totalPages = Math.max(Math.ceil(total / limit), 1);

      return res.status(200).json({
        items,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPrevPage: safePage > 1
        }
      });
    }

    return res.status(200).json(enrichedRooms);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch rooms', error: error.message });
  }
};

export const getRoomByIdHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const [room, tenants] = await Promise.all([
      getRoomById(req.params.id, ownerAccountId),
      getAllTenants(ownerAccountId)
    ]);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const [enrichedRoom] = enrichRoomsWithLiveStats([room], tenants);
    return res.status(200).json(enrichedRoom);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch room', error: error.message });
  }
};

export const updateRoomHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const existing = await getRoomById(req.params.id, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const errors = validateRoomPayload(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const input = pickAllowedInputFields(req.body);

    const nextBuildingId = input.building_id ?? existing.building_id;
    const nextRoomNumber = input.room_number ?? existing.room_number;

    const duplicateRoom = await getRoomByBuildingAndRoomNumber(
      nextBuildingId,
      nextRoomNumber,
      ownerAccountId
    );

    if (duplicateRoom && duplicateRoom.id !== existing.id) {
      return res.status(400).json({
        message: `Room number ${nextRoomNumber} already exists in this building`
      });
    }

    const payload = normalizeRoomForUpdate(existing, input, req.admin?.id || 'admin');
    const updated = await updateRoom(existing.id, ownerAccountId, payload);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update room', error: error.message });
  }
};

export const deleteRoomHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const isDeleted = await deleteRoom(req.params.id, ownerAccountId);
    if (!isDeleted) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete room', error: error.message });
  }
};


