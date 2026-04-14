import Building from '../models/building.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getAllBuildings = async (ownerAccountId) =>
  Building.find(ownerScopeQuery(ownerAccountId)).lean();

export const countBuildingsByOwner = async (ownerAccountId) =>
  Building.countDocuments(ownerScopeQuery(ownerAccountId));

export const getBuildingById = async (id, ownerAccountId) =>
  Building.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const createBuilding = async (building) => {
  const created = await Building.create(building);
  return created.toJSON();
};

export const updateBuilding = async (id, ownerAccountId, building) => {
  const updated = await Building.findOneAndUpdate({ id, ...ownerScopeQuery(ownerAccountId) }, building, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};

export const deleteBuilding = async (id, ownerAccountId) => {
  const deleted = await Building.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};
