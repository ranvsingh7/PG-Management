import { getTenantById, updateTenant } from '../data/tenant.store.js';
import { getOrCreateTenantProfile, updateTenantProfile } from '../data/tenant-profile.store.js';

const normalizeString = (value) => String(value || '').trim();

export const getTenantProfileHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const profile = await getOrCreateTenantProfile(tenantId, ownerAccountId);
    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch tenant profile', error: error.message });
  }
};

export const updateTenantProfileHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updates = {
      permanent_address: normalizeString(req.body?.permanent_address),
      occupation_type: normalizeString(req.body?.occupation_type).toLowerCase(),
      occupation_details: normalizeString(req.body?.occupation_details),
      emergency_contact_name: normalizeString(req.body?.emergency_contact_name),
      emergency_contact_phone: normalizeString(req.body?.emergency_contact_phone),
      emergency_contact_relation: normalizeString(req.body?.emergency_contact_relation),
      id_proof_type: normalizeString(req.body?.id_proof_type).toLowerCase(),
      id_proof_number: normalizeString(req.body?.id_proof_number),
      pan_number: normalizeString(req.body?.pan_number),
      secondary_id_type: normalizeString(req.body?.secondary_id_type).toLowerCase(),
      secondary_id_number: normalizeString(req.body?.secondary_id_number)
    };

    if (updates.emergency_contact_phone && !/^\d{10}$/.test(updates.emergency_contact_phone)) {
      return res.status(400).json({ message: 'emergency_contact_phone must be a 10 digit number' });
    }

    const updated = await updateTenantProfile(tenantId, ownerAccountId, updates);

    const tenant = await getTenantById(tenantId, ownerAccountId);
    if (tenant && tenant.onboarding_status !== 'completed') {
      const onboardingUpdates = { ...tenant, onboarding_status: 'pending' };
      delete onboardingUpdates._id;
      await updateTenant(tenantId, ownerAccountId, onboardingUpdates);
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update tenant profile', error: error.message });
  }
};
