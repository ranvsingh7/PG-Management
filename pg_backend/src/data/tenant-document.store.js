import TenantDocument from '../models/tenant-document.model.js';

export const getTenantDocuments = async (tenantId, ownerAccountId) =>
  TenantDocument.find({ tenant_id: tenantId, owner_account_id: ownerAccountId }).lean();

export const createTenantDocument = async (payload) => {
  const created = await TenantDocument.create(payload);
  return created.toJSON();
};
