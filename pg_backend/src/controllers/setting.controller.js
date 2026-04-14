import { getOrCreateSetting, updateSetting } from '../data/setting.store.js';

export const getSettingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';
    const setting = await getOrCreateSetting(ownerAccountId);
    return res.status(200).json(setting);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

export const updateSettingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id || 'admin';

    const updates = {
      property_name: String(req.body?.property_name || '').trim(),
      contact_phone: String(req.body?.contact_phone || '').trim(),
      contact_email: String(req.body?.contact_email || '').trim(),
      address: String(req.body?.address || '').trim(),
      currency: String(req.body?.currency || 'INR').trim() || 'INR',
      timezone: String(req.body?.timezone || 'Asia/Kolkata').trim() || 'Asia/Kolkata',
      invoice_prefix: String(req.body?.invoice_prefix || 'INV').trim() || 'INV'
    };

    const updated = await updateSetting(ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};
