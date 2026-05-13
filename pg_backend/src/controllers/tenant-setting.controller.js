import { getOrCreateSetting } from '../data/setting.store.js';

export const getTenantSettingHandler = async (req, res) => {
  try {
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const setting = await getOrCreateSetting(ownerAccountId);
    return res.status(200).json(setting);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};
