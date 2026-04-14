import Complaint from '../models/complaint.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getComplaints = async (ownerAccountId) =>
  Complaint.find(ownerScopeQuery(ownerAccountId)).sort({ complaint_date: -1, created_at: -1 }).lean();

export const getComplaintById = async (id, ownerAccountId) =>
  Complaint.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const createComplaint = async (complaint) => {
  const created = await Complaint.create(complaint);
  return created.toJSON();
};

export const updateComplaintById = async (id, ownerAccountId, updates) => {
  const updated = await Complaint.findOneAndUpdate(
    { id, ...ownerScopeQuery(ownerAccountId) },
    updates,
    { new: true, runValidators: true }
  );

  return updated ? updated.toJSON() : null;
};

export const deleteComplaintById = async (id, ownerAccountId) => {
  const deleted = await Complaint.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};
