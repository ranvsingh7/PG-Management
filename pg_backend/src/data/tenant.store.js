import Tenant from '../models/tenant.model.js';

const ownerScopeQuery = (ownerAccountId) => ({
  $or: [
    { owner_account_id: ownerAccountId },
    { owner_account_id: { $exists: false }, created_by: ownerAccountId }
  ]
});

export const getAllTenants = async (ownerAccountId) =>
  Tenant.find(ownerScopeQuery(ownerAccountId)).lean();

export const countTenantsByOwner = async (ownerAccountId) =>
  Tenant.countDocuments(ownerScopeQuery(ownerAccountId));

export const countActiveTenantsByRoom = async (
  ownerAccountId,
  buildingId,
  roomNumber,
  excludeTenantId = null
) => {
  const query = {
    ...ownerScopeQuery(ownerAccountId),
    building_id: buildingId,
    room_number: roomNumber,
    status: 'active'
  };

  if (excludeTenantId) {
    query.id = { $ne: excludeTenantId };
  }

  return Tenant.countDocuments(query);
};

export const getTenantById = async (id, ownerAccountId) =>
  Tenant.findOne({ id, ...ownerScopeQuery(ownerAccountId) }).lean();

export const getTenantByLoginId = async (loginId) =>
  Tenant.findOne({ login_id: loginId }).lean();

export const createTenant = async (tenant) => {
  const created = await Tenant.create(tenant);
  return created.toJSON();
};

export const updateTenant = async (id, ownerAccountId, tenant) => {
  const updated = await Tenant.findOneAndUpdate({ id, ...ownerScopeQuery(ownerAccountId) }, tenant, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};

export const deleteTenant = async (id, ownerAccountId) => {
  const deleted = await Tenant.findOneAndDelete({ id, ...ownerScopeQuery(ownerAccountId) });
  return Boolean(deleted);
};
