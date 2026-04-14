import PendingApproval from './pending-approval.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getPendingApprovals = async (ownerAccountId) =>
  PendingApproval.find(ownerScopeQuery(ownerAccountId)).sort({ submitted_date: -1, created_at: -1 }).lean();

export const getPendingApprovalById = async (id, ownerAccountId) =>
  PendingApproval.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const createPendingApproval = async (payload) => {
  const created = await PendingApproval.create(payload);
  return created.toJSON();
};

export const updatePendingApprovalById = async (id, ownerAccountId, updates) => {
  const updated = await PendingApproval.findOneAndUpdate({ id, ...ownerScopeQuery(ownerAccountId) }, updates, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};

export const deletePendingApprovalById = async (id, ownerAccountId) => {
  const deleted = await PendingApproval.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};

