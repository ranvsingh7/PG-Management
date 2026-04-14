import { countAdminsByAccountOwnerId } from '../auth/admin.store.js';
import { countBuildingsByOwner } from '../building/building.store.js';
import { countTenantsByOwner } from '../tenant/tenant.store.js';

const FREE_LIMITS = {
  max_tenants: 50,
  max_buildings: 2,
  max_admins: 2,
  support: 'community'
};

export const getUsageHandler = async (req, res) => {
  try {
    const ownerAccountId = req.admin?.accountOwnerId || req.admin?.id;

    if (!ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [tenantCount, buildingCount, adminCount] = await Promise.all([
      countTenantsByOwner(ownerAccountId),
      countBuildingsByOwner(ownerAccountId),
      countAdminsByAccountOwnerId(ownerAccountId)
    ]);

    const approachingLimit =
      tenantCount >= Math.ceil(FREE_LIMITS.max_tenants * 0.8) ||
      buildingCount >= Math.ceil(FREE_LIMITS.max_buildings * 0.8) ||
      adminCount >= Math.ceil(FREE_LIMITS.max_admins * 0.8);

    const exceedsHardLimit =
      tenantCount > FREE_LIMITS.max_tenants ||
      buildingCount > FREE_LIMITS.max_buildings ||
      adminCount > FREE_LIMITS.max_admins;

    const exceedsSoftLimit =
      tenantCount > Math.ceil(FREE_LIMITS.max_tenants * 1.2) ||
      buildingCount > Math.ceil(FREE_LIMITS.max_buildings * 1.2) ||
      adminCount > Math.ceil(FREE_LIMITS.max_admins * 1.2);

    const payload = {
      tenant_count: tenantCount,
      building_count: buildingCount,
      current_tier: 'free',
      limits: FREE_LIMITS,
      approaching_limit: approachingLimit,
      exceeds_soft_limit: exceedsSoftLimit,
      exceeds_hard_limit: exceedsHardLimit,
      should_upgrade: approachingLimit || exceedsSoftLimit || exceedsHardLimit,
      is_whitelisted: false,
      subscription: null
    };

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch usage', error: error.message });
  }
};


