import { v4 as uuidv4 } from 'uuid';
import {
  getBuildingById,
} from '../building/building.store.js';
import {
  countActiveTenantsByRoom,
  createTenant,
  deleteTenant,
  getAllTenants,
  getTenantById,
  updateTenant
} from './tenant.store.js';
import { getAdminById, getAdminByEmail } from '../auth/admin.store.js';
import { getRoomByBuildingAndRoomNumber } from '../room/room.store.js';
import {
  allowedInputFields,
  validateTenantPayload
} from '../../validators/tenant.validator.js';
import { recordCheckInReading } from '../electricity/electricity.service.js';

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

const normalizeTenantForCreate = (payload, createdBy) => ({
  id: uuidv4(),
  name: payload.name,
  email: payload.email,
  phone: payload.phone,
  building_id: payload.building_id,
  room_number: payload.room_number,
  check_in_date: payload.check_in_date,
  check_out_date: payload.check_out_date || null,
  rent: payload.rent,
  status: payload.status,
  agreement: payload.agreement || null,
  approval_status: payload.approval_status || 'approved',
  pg_id: payload.pg_id || null,
  password_hash: payload.password_hash || null,
  security_deposit_amount: Number.isFinite(payload.security_deposit_amount) ? payload.security_deposit_amount : 0,
  owner_account_id: createdBy,
  created_by: createdBy,
  created_at: nowIso(),
  moving_history: payload.moving_history || []
});

const normalizeTenantForUpdate = (existing, payload, updatedBy) => ({
  ...existing,
  ...payload,
  id: existing.id,
  created_at: existing.created_at,
  updated_by: updatedBy,
  updated_at: nowIso()
});

export const createTenantHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const errors = validateTenantPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const input = pickAllowedInputFields(req.body);

    const room = await getRoomByBuildingAndRoomNumber(input.building_id, input.room_number, ownerAccountId);
    if (!room) {
      return res.status(400).json({ message: 'Selected room not found in this building' });
    }

    const building = await getBuildingById(input.building_id, ownerAccountId);
    if (!building) {
      return res.status(400).json({ message: 'Selected building not found' });
    }

    if (input.status === 'active') {
      const activeTenantCount = await countActiveTenantsByRoom(
        ownerAccountId,
        input.building_id,
        input.room_number
      );

      if (activeTenantCount >= Number(room.capacity || 0)) {
        return res.status(400).json({ message: 'Selected room is full. Please choose another room.' });
      }
    }

    // Calculate prorated rent based on check-in date
    const fullMonthlyRent = Number(input.rent || 0);
    const checkInDate = new Date(input.check_in_date);
    const year = checkInDate.getUTCFullYear();
    const month = checkInDate.getUTCMonth();
    
    // Get last day of the month
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDayOfMonth.getUTCDate();
    
    // Calculate days remaining (including check-in day)
    const checkInDay = checkInDate.getUTCDate();
    const daysRemaining = daysInMonth - checkInDay + 1;
    
    // Calculate prorated rent
    const advanceRentAmount = Number(((fullMonthlyRent / daysInMonth) * daysRemaining).toFixed(2));
    const securityDepositAmount = Number.isFinite(input.security_deposit_amount) ? Number(input.security_deposit_amount) : 0;
    const checkInTotalDue = Number((advanceRentAmount + securityDepositAmount).toFixed(2));

    const tenant = {
      ...normalizeTenantForCreate(input, ownerAccountId),
      advance_rent_amount: advanceRentAmount,
      security_deposit_amount: securityDepositAmount,
      check_in_total_due: checkInTotalDue,
      check_in_payment_status: 'pending'
    };
    const created = await createTenant(tenant);

    if (Number.isFinite(input.current_reading) && input.current_reading >= 0) {
      await recordCheckInReading({
        ownerAccountId,
        tenant: created,
        readingValue: Number(input.current_reading),
        readingDate: input.check_in_date,
        createdBy: req.admin?.id || 'admin'
      });
    }

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create tenant', error: error.message });
  }
};

export const getAllTenantsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const tenants = await getAllTenants(ownerAccountId);

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 0);
    const search = String(req.query.search || '').trim().toLowerCase();

    let filtered = tenants;

    if (search) {
      filtered = tenants.filter((tenant) => {
        const name = String(tenant.name || '').toLowerCase();
        const phone = String(tenant.phone || '').toLowerCase();
        const email = String(tenant.email || '').toLowerCase();
        const roomNumber = String(tenant.room_number || '').toLowerCase();
        const status = String(tenant.status || '').toLowerCase();

        return (
          name.includes(search) ||
          phone.includes(search) ||
          email.includes(search) ||
          roomNumber.includes(search) ||
          status.includes(search)
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

    return res.status(200).json(tenants);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch tenants', error: error.message });
  }
};

export const getTenantByIdHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const tenant = await getTenantById(req.params.id, ownerAccountId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    let createdByName = '';
    const createdByValue = String(tenant.created_by || '').trim();

    if (createdByValue) {
      const adminById = await getAdminById(createdByValue);
      if (adminById?.full_name) {
        createdByName = String(adminById.full_name);
      } else if (createdByValue.includes('@')) {
        const adminByEmail = await getAdminByEmail(createdByValue.toLowerCase());
        if (adminByEmail?.full_name) {
          createdByName = String(adminByEmail.full_name);
        }
      }
    }

    return res.status(200).json({
      ...tenant,
      created_by_name: createdByName || null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch tenant', error: error.message });
  }
};

export const updateTenantHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const existing = await getTenantById(req.params.id, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const errors = validateTenantPayload(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const input = pickAllowedInputFields(req.body);

    const nextBuildingId = input.building_id ?? existing.building_id;
    const nextRoomNumber = input.room_number ?? existing.room_number;
    const nextStatus = input.status ?? existing.status;

    const room = await getRoomByBuildingAndRoomNumber(nextBuildingId, nextRoomNumber, ownerAccountId);
    if (!room) {
      return res.status(400).json({ message: 'Selected room not found in this building' });
    }

    if (nextStatus === 'active') {
      const activeTenantCount = await countActiveTenantsByRoom(
        ownerAccountId,
        nextBuildingId,
        nextRoomNumber,
        existing.id
      );

      if (activeTenantCount >= Number(room.capacity || 0)) {
        return res.status(400).json({ message: 'Selected room is full. Please choose another room.' });
      }
    }

    const payload = normalizeTenantForUpdate(existing, input, req.admin?.id || 'admin');
    const updated = await updateTenant(existing.id, ownerAccountId, payload);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update tenant', error: error.message });
  }
};

export const deleteTenantHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const isDeleted = await deleteTenant(req.params.id, ownerAccountId);
    if (!isDeleted) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete tenant', error: error.message });
  }
};


