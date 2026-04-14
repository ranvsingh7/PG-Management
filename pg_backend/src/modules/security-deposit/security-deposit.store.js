import SecurityDeposit from './security-deposit.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getSecurityDeposits = async (ownerAccountId) =>
  SecurityDeposit.find(ownerScopeQuery(ownerAccountId)).sort({ collected_date: -1, created_at: -1 }).lean();

export const getSecurityDepositById = async (id, ownerAccountId) =>
  SecurityDeposit.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const createSecurityDeposit = async (payload) => {
  const created = await SecurityDeposit.create(payload);
  return created.toJSON();
};

export const updateSecurityDepositById = async (id, ownerAccountId, updates) => {
  const updated = await SecurityDeposit.findOneAndUpdate({ id, ...ownerScopeQuery(ownerAccountId) }, updates, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};

export const deleteSecurityDepositById = async (id, ownerAccountId) => {
  const deleted = await SecurityDeposit.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};

