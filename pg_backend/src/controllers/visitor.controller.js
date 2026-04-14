import { v4 as uuidv4 } from 'uuid';
import {
  createVisitor,
  deleteVisitorById,
  getVisitorById,
  getVisitors,
  updateVisitorById
} from '../data/visitor.store.js';

const validStatuses = new Set(['checked_in', 'checked_out']);

export const getVisitorsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const query = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || 'all').toLowerCase();

    let rows = await getVisitors(ownerAccountId);

    if (status !== 'all') {
      rows = rows.filter((row) => String(row.status || '').toLowerCase() === status);
    }

    if (query) {
      rows = rows.filter((row) => {
        const name = String(row.visitor_name || '').toLowerCase();
        const tenant = String(row.tenant_name || '').toLowerCase();
        const room = String(row.room_number || '').toLowerCase();
        const phone = String(row.phone || '').toLowerCase();
        const purpose = String(row.purpose || '').toLowerCase();
        return name.includes(query) || tenant.includes(query) || room.includes(query) || phone.includes(query) || purpose.includes(query);
      });
    }

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch visitors', error: error.message });
  }
};

export const createVisitorHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const visitorName = String(req.body?.visitor_name || '').trim();
    const purpose = String(req.body?.purpose || '').trim();
    const checkInRaw = req.body?.check_in_at;

    if (!visitorName || !purpose || !checkInRaw) {
      return res.status(400).json({ message: 'visitor_name, purpose and check_in_at are required' });
    }

    const checkInDate = new Date(checkInRaw);
    if (Number.isNaN(checkInDate.getTime())) {
      return res.status(400).json({ message: 'check_in_at must be a valid date' });
    }

    const payload = {
      id: uuidv4(),
      owner_account_id: ownerAccountId,
      tenant_id: String(req.body?.tenant_id || '').trim(),
      building_id: String(req.body?.building_id || '').trim(),
      building_name: String(req.body?.building_name || '').trim(),
      visitor_name: visitorName,
      phone: String(req.body?.phone || '').trim(),
      purpose,
      tenant_name: String(req.body?.tenant_name || '').trim(),
      room_number: String(req.body?.room_number || '').trim(),
      check_in_at: checkInDate,
      check_out_at: null,
      status: 'checked_in',
      notes: String(req.body?.notes || '').trim(),
      created_by: req.admin?.id || 'admin',
      created_at: new Date(),
      updated_at: null
    };

    const created = await createVisitor(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create visitor', error: error.message });
  }
};

export const updateVisitorHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const visitorId = req.params.id;

    const existing = await getVisitorById(visitorId, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    const updates = {};

    if (req.body?.visitor_name !== undefined) {
      const value = String(req.body.visitor_name || '').trim();
      if (!value) {
        return res.status(400).json({ message: 'visitor_name cannot be empty' });
      }
      updates.visitor_name = value;
    }

    if (req.body?.purpose !== undefined) {
      const value = String(req.body.purpose || '').trim();
      if (!value) {
        return res.status(400).json({ message: 'purpose cannot be empty' });
      }
      updates.purpose = value;
    }

    if (req.body?.status !== undefined) {
      const value = String(req.body.status || '').toLowerCase();
      if (!validStatuses.has(value)) {
        return res.status(400).json({ message: 'status must be checked_in or checked_out' });
      }
      updates.status = value;

      if (value === 'checked_out') {
        updates.check_out_at = req.body?.check_out_at ? new Date(req.body.check_out_at) : new Date();
      }

      if (value === 'checked_in') {
        updates.check_out_at = null;
      }
    }

    if (req.body?.phone !== undefined) {
      updates.phone = String(req.body.phone || '').trim();
    }

    if (req.body?.tenant_name !== undefined) {
      updates.tenant_name = String(req.body.tenant_name || '').trim();
    }

    if (req.body?.tenant_id !== undefined) {
      updates.tenant_id = String(req.body.tenant_id || '').trim();
    }

    if (req.body?.building_id !== undefined) {
      updates.building_id = String(req.body.building_id || '').trim();
    }

    if (req.body?.building_name !== undefined) {
      updates.building_name = String(req.body.building_name || '').trim();
    }

    if (req.body?.room_number !== undefined) {
      updates.room_number = String(req.body.room_number || '').trim();
    }

    if (req.body?.notes !== undefined) {
      updates.notes = String(req.body.notes || '').trim();
    }

    updates.updated_at = new Date();

    const updated = await updateVisitorById(visitorId, ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update visitor', error: error.message });
  }
};

export const deleteVisitorHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const deleted = await deleteVisitorById(req.params.id, ownerAccountId);

    if (!deleted) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete visitor', error: error.message });
  }
};
