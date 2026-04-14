import Invoice from './invoice.model.js';

export const createManyInvoices = async (records) => {
  if (!records.length) {
    return [];
  }

  const created = [];
  for (const record of records) {
    try {
      const doc = await Invoice.create(record);
      created.push(doc.toJSON());
    } catch (error) {
      if (error?.code === 11000) {
        continue;
      }
      continue;
    }
  }

  return created;
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

export const getInvoicesForPeriod = async (period) =>
  Invoice.find({ period }).select({ invoice_number: 1 }).lean();

export const getInvoiceById = async (id, ownerAccountId) =>
  Invoice.findOne({ id, owner_account_id: ownerAccountId }).lean();

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

