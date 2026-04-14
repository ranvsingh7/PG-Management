import Setting from '../models/setting.model.js';

const defaultSetting = (ownerAccountId) => ({
  owner_account_id: ownerAccountId,
  property_name: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  invoice_prefix: 'INV',
  updated_at: new Date()
});

export const getOrCreateSetting = async (ownerAccountId) => {
  let setting = await Setting.findOne({ owner_account_id: ownerAccountId }).lean();

  if (!setting) {
    const created = await Setting.create(defaultSetting(ownerAccountId));
    setting = created.toJSON();
  }

  return setting;
};

export const updateSetting = async (ownerAccountId, updates) => {
  const updated = await Setting.findOneAndUpdate(
    { owner_account_id: ownerAccountId },
    { ...updates, updated_at: new Date() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return updated.toJSON();
};
