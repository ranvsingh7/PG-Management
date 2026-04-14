import { getOrCreateSetting, updateSetting } from './setting.store.js';

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

    const rateRaw = req.body?.electricity_rate_per_unit;
    if (rateRaw !== undefined) {
      const parsedRate = Number(rateRaw);
      if (!Number.isFinite(parsedRate) || parsedRate < 0) {
        return res.status(400).json({ message: 'electricity_rate_per_unit must be a non-negative number' });
      }
      updates.electricity_rate_per_unit = Number(parsedRate.toFixed(2));
    }

    if (req.body?.electricity_unit_label !== undefined) {
      const label = String(req.body.electricity_unit_label || '').trim();
      updates.electricity_unit_label = label || 'kWh';
    }

    const updated = await updateSetting(ownerAccountId, updates);
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};


