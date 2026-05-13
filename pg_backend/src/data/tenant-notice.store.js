import TenantNotice from '../models/tenant-notice.model.js';

export const getTenantNotices = async (tenantId, ownerAccountId) =>
  TenantNotice.find({ tenant_id: tenantId, owner_account_id: ownerAccountId }).lean();

export const createTenantNotice = async (payload) => {
  const created = await TenantNotice.create(payload);
  return created.toJSON();
};
