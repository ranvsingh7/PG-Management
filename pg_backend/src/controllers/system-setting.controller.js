import { getDefaultFreeLimits, getOrCreateSystemSetting, updateSystemSetting } from '../data/system-setting.store.js';

export const getSystemSettingHandler = async (_req, res) => {
  try {
    const setting = await getOrCreateSystemSetting();
    return res.status(200).json(setting);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch system settings', error: error.message });
  }
};

export const updateSystemSettingHandler = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can update system settings' });
    }

    const maxTenants = Number(req.body?.max_tenants);
    const maxBuildings = Number(req.body?.max_buildings);
    const maxAdmins = Number(req.body?.max_admins);
    const support = String(req.body?.support || '').trim() || getDefaultFreeLimits().support;

    if (!Number.isFinite(maxTenants) || maxTenants < 0) {
      return res.status(400).json({ message: 'max_tenants must be a non-negative number' });
    }

    if (!Number.isFinite(maxBuildings) || maxBuildings < 0) {
      return res.status(400).json({ message: 'max_buildings must be a non-negative number' });
    }

    if (!Number.isFinite(maxAdmins) || maxAdmins < 0) {
      return res.status(400).json({ message: 'max_admins must be a non-negative number' });
    }

    const updated = await updateSystemSetting({
      max_tenants: Math.trunc(maxTenants),
      max_buildings: Math.trunc(maxBuildings),
      max_admins: Math.trunc(maxAdmins),
      support
    });

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update system settings', error: error.message });
  }
};
