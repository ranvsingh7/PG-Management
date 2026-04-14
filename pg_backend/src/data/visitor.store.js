import Visitor from '../models/visitor.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getVisitors = async (ownerAccountId) =>
  Visitor.find(ownerScopeQuery(ownerAccountId)).sort({ check_in_at: -1, created_at: -1 }).lean();

export const getVisitorById = async (id, ownerAccountId) =>
  Visitor.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const createVisitor = async (payload) => {
  const created = await Visitor.create(payload);
  return created.toJSON();
};

export const updateVisitorById = async (id, ownerAccountId, updates) => {
  const updated = await Visitor.findOneAndUpdate({ id, ...ownerScopeQuery(ownerAccountId) }, updates, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};

export const deleteVisitorById = async (id, ownerAccountId) => {
  const deleted = await Visitor.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};
