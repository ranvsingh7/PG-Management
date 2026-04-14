import { v4 as uuidv4 } from 'uuid';
import {
  createPendingApproval,
  deletePendingApprovalById,
  getPendingApprovalById,
  getPendingApprovals,
  updatePendingApprovalById
} from './pending-approval.store.js';

const validTypes = new Set(['tenant', 'staff', 'booking', 'other']);
const validStatuses = new Set(['pending', 'approved', 'rejected']);

export const getPendingApprovalsHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const query = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || 'all').toLowerCase();

    let rows = await getPendingApprovals(ownerAccountId);

    if (status !== 'all') {
      rows = rows.filter((row) => String(row.status || '').toLowerCase() === status);
    }

    if (query) {
      rows = rows.filter((row) => {
        const name = String(row.applicant_name || '').toLowerCase();
        const type = String(row.approval_type || '').toLowerCase();
        const note = String(row.request_note || '').toLowerCase();
        return name.includes(query) || type.includes(query) || note.includes(query);
      });
    }

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch pending approvals', error: error.message });
  }
};

export const createPendingApprovalHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const applicantName = String(req.body?.applicant_name || '').trim();
    const approvalType = String(req.body?.approval_type || '').toLowerCase();
    const submittedDate = String(req.body?.submitted_date || '').trim();

    if (!applicantName || !submittedDate || !validTypes.has(approvalType)) {
      return res.status(400).json({ message: 'applicant_name, approval_type and submitted_date are required' });
    }

    const payload = {
      id: uuidv4(),
      owner_account_id: ownerAccountId,
      applicant_name: applicantName,
      approval_type: approvalType,
      request_note: String(req.body?.request_note || '').trim(),
      submitted_date: submittedDate,
      status: 'pending',
      reviewed_date: null,
      reviewed_by: null,
      created_by: req.admin?.id || 'admin',
      created_at: new Date(),
      updated_at: null
    };

    const created = await createPendingApproval(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create pending approval', error: error.message });
  }
};

export const updatePendingApprovalHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const itemId = req.params.id;

    const existing = await getPendingApprovalById(itemId, ownerAccountId);
    if (!existing) {
      return res.status(404).json({ message: 'Pending approval not found' });
    }

    const updates = {};

    if (req.body?.applicant_name !== undefined) {
      const value = String(req.body.applicant_name || '').trim();
      if (!value) {
        return res.status(400).json({ message: 'applicant_name cannot be empty' });
      }
      updates.applicant_name = value;
    }

    if (req.body?.approval_type !== undefined) {
      const value = String(req.body.approval_type || '').toLowerCase();
      if (!validTypes.has(value)) {
        return res.status(400).json({ message: 'approval_type is invalid' });
      }
      updates.approval_type = value;
    }

    if (req.body?.request_note !== undefined) {
      updates.request_note = String(req.body.request_note || '').trim();
    }

    if (req.body?.submitted_date !== undefined) {
      updates.submitted_date = String(req.body.submitted_date || '').trim();
    }

    if (req.body?.status !== undefined) {
      const value = String(req.body.status || '').toLowerCase();
      if (!validStatuses.has(value)) {
        return res.status(400).json({ message: 'status must be pending, approved, or rejected' });
      }

      updates.status = value;
      if (value === 'pending') {
        updates.reviewed_date = null;
        updates.reviewed_by = null;
      } else {
        updates.reviewed_date = req.body?.reviewed_date || new Date().toISOString().slice(0, 10);
        updates.reviewed_by = req.admin?.id || 'admin';
      }
    }

    updates.updated_at = new Date();

    const updated = await updatePendingApprovalById(itemId, ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update pending approval', error: error.message });
  }
};

export const deletePendingApprovalHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const deleted = await deletePendingApprovalById(req.params.id, ownerAccountId);

    if (!deleted) {
      return res.status(404).json({ message: 'Pending approval not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete pending approval', error: error.message });
  }
};


