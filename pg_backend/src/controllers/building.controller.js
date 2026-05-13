import { v4 as uuidv4 } from 'uuid';
import {
  createBuilding,
  deleteBuilding,
  getAllBuildings,
  getBuildingByCode,
  getBuildingById,
  updateBuilding
} from '../data/building.store.js';
import {
  allowedInputFields,
  validateBuildingPayload
} from '../validators/building.validator.js';

const nowIso = () => new Date().toISOString();

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 32);

const buildUniquePropertyCode = async (name) => {
  const base = slugify(name) || `pg-${uuidv4().slice(0, 6)}`;
  let candidate = base;
  let counter = 1;

  while (await getBuildingByCode(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`.slice(0, 32);
  }

  return candidate;
};

const pickAllowedInputFields = (payload) => {
  const picked = {};

  allowedInputFields.forEach((field) => {
    if (payload[field] !== undefined) {
      picked[field] = payload[field];
    }
  });

  return picked;
};

const normalizeBuildingForCreate = (payload, createdBy) => {
  const base = {
    id: uuidv4(),
    name: payload.name,
    property_code: payload.property_code,
    address: payload.address,
    city: payload.city,
    area: payload.area,
    total_floors: payload.total_floors,
    total_rooms: payload.total_rooms,
    caretaker_name: payload.caretaker_name ?? '',
    caretaker_phone: payload.caretaker_phone ?? '',
    amenities: payload.amenities ?? [],
    security_deposit: payload.security_deposit ?? 0,
    electricity_rate: payload.electricity_rate ?? 0,
    status: 'active',
    owner_account_id: createdBy,
    created_by: createdBy,
    created_at: nowIso(),
    total_beds: 0,
    occupied_beds: 0,
    available_beds: 0,
    occupancy_percentage: 0
  };

  return base;
};

const normalizeBuildingForUpdate = (existing, payload, updatedBy) => ({
  ...existing,
  ...payload,
  id: existing.id,
  created_at: existing.created_at,
  updated_by: updatedBy,
  updated_at: nowIso()
});

export const createBuildingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const errors = validateBuildingPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const input = pickAllowedInputFields(req.body);
    const propertyCode = await buildUniquePropertyCode(input.name);
    const building = normalizeBuildingForCreate({ ...input, property_code: propertyCode }, ownerAccountId);
    const created = await createBuilding(building);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create building', error: error.message });
  }
};

export const getAllBuildingsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const buildings = await getAllBuildings(ownerAccountId);

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 0);
    const search = String(req.query.search || '').trim().toLowerCase();

    let filtered = buildings;

    if (search) {
      filtered = buildings.filter((building) => {
        const name = String(building.name || '').toLowerCase();
        const address = String(building.address || '').toLowerCase();
        const city = String(building.city || '').toLowerCase();
        const area = String(building.area || '').toLowerCase();

        return (
          name.includes(search) ||
          address.includes(search) ||
          city.includes(search) ||
          area.includes(search)
        );
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

    return res.status(200).json(buildings);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch buildings', error: error.message });
  }
};

export const getBuildingByIdHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const building = await getBuildingById(req.params.id, ownerAccountId);
    if (!building) {
      return res.status(404).json({ message: 'Building not found' });
    }

    return res.status(200).json(building);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch building', error: error.message });
  }
};

export const updateBuildingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const existing = await getBuildingById(req.params.id, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Building not found' });
    }

    const errors = validateBuildingPayload(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const input = pickAllowedInputFields(req.body);
    const payload = normalizeBuildingForUpdate(existing, input, req.admin?.id || 'admin');
    const updated = await updateBuilding(existing.id, ownerAccountId, payload);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update building', error: error.message });
  }
};

export const deleteBuildingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const isDeleted = await deleteBuilding(req.params.id, ownerAccountId);
    if (!isDeleted) {
      return res.status(404).json({ message: 'Building not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete building', error: error.message });
  }
};
