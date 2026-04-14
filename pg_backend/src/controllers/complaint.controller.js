import { v4 as uuidv4 } from 'uuid';
import {
  createComplaint,
  deleteComplaintById,
  getComplaintById,
  getComplaints,
  updateComplaintById
} from '../data/complaint.store.js';

const VALID_CATEGORIES = new Set(['maintenance', 'electricity', 'cleaning', 'security', 'other']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const VALID_STATUSES = new Set(['open', 'in_progress', 'resolved']);

const isDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const normalizeInput = (payload = {}, { partial = false } = {}) => {
  const errors = [];
  const updates = {};

  if (!partial || payload.tenant_name !== undefined) {
    const tenantName = String(payload.tenant_name || '').trim();
    if (!tenantName) {
      errors.push('tenant_name is required');
    } else {
      updates.tenant_name = tenantName;
    }
  }

  if (!partial || payload.room_number !== undefined) {
    const roomNumber = String(payload.room_number || '').trim();
    if (!roomNumber) {
      errors.push('room_number is required');
    } else {
      updates.room_number = roomNumber;
    }
  }

  if (!partial || payload.category !== undefined) {
    const category = String(payload.category || '').toLowerCase();
    if (!VALID_CATEGORIES.has(category)) {
      errors.push('category is invalid');
    } else {
      updates.category = category;
    }
  }

  if (!partial || payload.priority !== undefined) {
    const priority = String(payload.priority || '').toLowerCase();
    if (!VALID_PRIORITIES.has(priority)) {
      errors.push('priority is invalid');
    } else {
      updates.priority = priority;
    }
  }

  if (!partial || payload.description !== undefined) {
    const description = String(payload.description || '').trim();
    if (!description) {
      errors.push('description is required');
    } else {
      updates.description = description;
    }
  }

  if (!partial || payload.status !== undefined) {
    const status = String(payload.status || '').toLowerCase();
    if (!VALID_STATUSES.has(status)) {
      errors.push('status is invalid');
    } else {
      updates.status = status;
    }
  }

  if (!partial || payload.complaint_date !== undefined) {
    if (!isDateString(payload.complaint_date)) {
      errors.push('complaint_date must be in YYYY-MM-DD format');
    } else {
      updates.complaint_date = String(payload.complaint_date);
    }
  }

  if (!partial || payload.resolved_date !== undefined) {
    if (payload.resolved_date === undefined || payload.resolved_date === null || payload.resolved_date === '') {
      updates.resolved_date = null;
    } else if (!isDateString(payload.resolved_date)) {
      errors.push('resolved_date must be null or in YYYY-MM-DD format');
    } else {
      updates.resolved_date = String(payload.resolved_date);
    }
  }

  return { errors, updates };
};

export const getComplaintsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const month = String(req.query.month || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').toLowerCase();

    const rows = await getComplaints(ownerAccountId);
    let filtered = rows;

    if (month) {
      filtered = filtered.filter((row) => String(row.complaint_date || '').startsWith(month));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((row) => String(row.status || '').toLowerCase() === statusFilter);
    }

    if (search) {
      filtered = filtered.filter((row) => {
        const tenantName = String(row.tenant_name || '').toLowerCase();
        const room = String(row.room_number || '').toLowerCase();
        const category = String(row.category || '').toLowerCase();
        const description = String(row.description || '').toLowerCase();

        return tenantName.includes(search) || room.includes(search) || category.includes(search) || description.includes(search);
      });
    }

    return res.status(200).json(filtered);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
};

export const createComplaintHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const { errors, updates } = normalizeInput(req.body, { partial: false });

    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const payload = {
      id: uuidv4(),
      owner_account_id: ownerAccountId,
      ...updates,
      resolved_date: updates.status === 'resolved' ? updates.resolved_date || updates.complaint_date : null,
      created_by: req.admin?.id || 'admin',
      created_at: new Date(),
      updated_at: null
    };

    const created = await createComplaint(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create complaint', error: error.message });
  }
};

export const updateComplaintHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const complaintId = req.params.id;

    const existing = await getComplaintById(complaintId, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const { errors, updates } = normalizeInput(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    if (updates.status === 'resolved' && updates.resolved_date === undefined) {
      updates.resolved_date = new Date().toISOString().slice(0, 10);
    }

    if (updates.status && updates.status !== 'resolved' && req.body?.resolved_date === undefined) {
      updates.resolved_date = null;
    }

    updates.updated_at = new Date();

    const updated = await updateComplaintById(complaintId, ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update complaint', error: error.message });
  }
};

export const deleteComplaintHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const deleted = await deleteComplaintById(req.params.id, ownerAccountId);

    if (!deleted) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete complaint', error: error.message });
  }
};
