import Invoice from '../models/invoice.model.js';

export const createManyInvoices = async (records) => {
  if (!records.length) {
    return [];
  }

  const created = await Invoice.insertMany(records, { ordered: false });
  return created.map((doc) => doc.toJSON());
};

export const getInvoices = async (ownerAccountId, filters = {}) => {
  const query = {
    owner_account_id: ownerAccountId
  };

  if (filters.period) {
    query.period = filters.period;
  }

  if (filters.building_id) {
    query.building_id = filters.building_id;
  }

  return Invoice.find(query).sort({ created_at: -1 }).lean();
};

export const getInvoiceById = async (id, ownerAccountId) =>
  Invoice.findOne({ id, owner_account_id: ownerAccountId }).lean();

export const getInvoicesByTenant = async (ownerAccountId, tenantId) =>
  Invoice.find({ owner_account_id: ownerAccountId, tenant_id: tenantId }).sort({ created_at: -1 }).lean();

export const updateInvoiceById = async (id, ownerAccountId, updates) => {
  const updated = await Invoice.findOneAndUpdate(
    { id, owner_account_id: ownerAccountId },
    { ...updates, updated_at: new Date() },
    { new: true, runValidators: true }
  );

  return updated ? updated.toJSON() : null;
};

export const deleteInvoiceById = async (id, ownerAccountId) => {
  const deleted = await Invoice.findOneAndDelete({ id, owner_account_id: ownerAccountId });
  return deleted ? deleted.toJSON() : null;
};
