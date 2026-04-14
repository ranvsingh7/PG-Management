import { v4 as uuidv4 } from 'uuid';
import {
  createSecurityDeposit,
  deleteSecurityDepositById,
  getSecurityDepositById,
  getSecurityDeposits,
  updateSecurityDepositById
} from './security-deposit.store.js';

const validStatuses = new Set(['held', 'partially_refunded', 'refunded']);

export const getSecurityDepositsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const query = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || 'all').toLowerCase();

    let rows = await getSecurityDeposits(ownerAccountId);

    if (status !== 'all') {
      rows = rows.filter((row) => String(row.status || '').toLowerCase() === status);
    }

    if (query) {
      rows = rows.filter((row) => {
        const tenant = String(row.tenant_name || '').toLowerCase();
        const room = String(row.room_number || '').toLowerCase();
        return tenant.includes(query) || room.includes(query);
      });
    }

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch security deposits', error: error.message });
  }
};

export const createSecurityDepositHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const tenantName = String(req.body?.tenant_name || '').trim();
    const roomNumber = String(req.body?.room_number || '').trim();
    const totalAmount = Number(req.body?.total_amount);
    const collectedAmount = Number(req.body?.collected_amount ?? totalAmount);
    const collectedDate = String(req.body?.collected_date || '').trim();

    if (!tenantName || !roomNumber || !collectedDate || !Number.isFinite(totalAmount) || totalAmount < 0) {
      return res.status(400).json({ message: 'tenant_name, room_number, total_amount and collected_date are required' });
    }

    if (!Number.isFinite(collectedAmount) || collectedAmount < 0 || collectedAmount > totalAmount) {
      return res.status(400).json({ message: 'collected_amount must be between 0 and total_amount' });
    }

    const refundableAmount = Number((collectedAmount - Number(req.body?.refunded_amount || 0)).toFixed(2));
    const status = refundableAmount <= 0 ? 'refunded' : collectedAmount < totalAmount ? 'held' : 'held';

    const payload = {
      id: uuidv4(),
      owner_account_id: ownerAccountId,
      tenant_name: tenantName,
      room_number: roomNumber,
      total_amount: Number(totalAmount.toFixed(2)),
      collected_amount: Number(collectedAmount.toFixed(2)),
      refundable_amount: Number(Math.max(refundableAmount, 0).toFixed(2)),
      status,
      collected_date: collectedDate,
      refund_date: null,
      notes: String(req.body?.notes || '').trim(),
      created_by: req.admin?.id || 'admin',
      created_at: new Date(),
      updated_at: null
    };

    const created = await createSecurityDeposit(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create security deposit', error: error.message });
  }
};

export const updateSecurityDepositHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const recordId = req.params.id;

    const existing = await getSecurityDepositById(recordId, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Security deposit record not found' });
    }

    const updates = {};

    if (req.body?.tenant_name !== undefined) {
      const value = String(req.body.tenant_name || '').trim();
      if (!value) {
        return res.status(400).json({ message: 'tenant_name cannot be empty' });
      }
      updates.tenant_name = value;
    }

    if (req.body?.room_number !== undefined) {
      const value = String(req.body.room_number || '').trim();
      if (!value) {
        return res.status(400).json({ message: 'room_number cannot be empty' });
      }
      updates.room_number = value;
    }

    const totalAmount = req.body?.total_amount !== undefined ? Number(req.body.total_amount) : Number(existing.total_amount || 0);
    const collectedAmount = req.body?.collected_amount !== undefined ? Number(req.body.collected_amount) : Number(existing.collected_amount || 0);

    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return res.status(400).json({ message: 'total_amount must be a non-negative number' });
    }

    if (!Number.isFinite(collectedAmount) || collectedAmount < 0 || collectedAmount > totalAmount) {
      return res.status(400).json({ message: 'collected_amount must be between 0 and total_amount' });
    }

    updates.total_amount = Number(totalAmount.toFixed(2));
    updates.collected_amount = Number(collectedAmount.toFixed(2));

    let nextStatus = String(req.body?.status || existing.status || 'held').toLowerCase();
    if (!validStatuses.has(nextStatus)) {
      return res.status(400).json({ message: 'status must be held, partially_refunded or refunded' });
    }

    if (req.body?.refundable_amount !== undefined) {
      const refundable = Number(req.body.refundable_amount);
      if (!Number.isFinite(refundable) || refundable < 0 || refundable > collectedAmount) {
        return res.status(400).json({ message: 'refundable_amount must be between 0 and collected_amount' });
      }
      updates.refundable_amount = Number(refundable.toFixed(2));
    } else {
      const current = Number(existing.refundable_amount || 0);
      updates.refundable_amount = Number(Math.min(current, collectedAmount).toFixed(2));
    }

    if (updates.refundable_amount <= 0) {
      nextStatus = 'refunded';
      updates.refund_date = req.body?.refund_date || existing.refund_date || new Date().toISOString().slice(0, 10);
    } else if (updates.refundable_amount < collectedAmount) {
      nextStatus = 'partially_refunded';
      if (req.body?.refund_date !== undefined) {
        updates.refund_date = req.body.refund_date || null;
      }
    } else {
      nextStatus = 'held';
      updates.refund_date = null;
    }

    updates.status = nextStatus;

    if (req.body?.collected_date !== undefined) {
      updates.collected_date = String(req.body.collected_date || '').trim();
    }

    if (req.body?.notes !== undefined) {
      updates.notes = String(req.body.notes || '').trim();
    }

    updates.updated_at = new Date();

    const updated = await updateSecurityDepositById(recordId, ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update security deposit', error: error.message });
  }
};

export const deleteSecurityDepositHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const deleted = await deleteSecurityDepositById(req.params.id, ownerAccountId);

    if (!deleted) {
      return res.status(404).json({ message: 'Security deposit record not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete security deposit', error: error.message });
  }
};


