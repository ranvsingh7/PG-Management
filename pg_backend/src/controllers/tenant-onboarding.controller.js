import { getTenantById, updateTenant } from '../data/tenant.store.js';
import { getOrCreateTenantProfile } from '../data/tenant-profile.store.js';
import { getTenantDocuments } from '../data/tenant-document.store.js';

const hasValue = (value) => String(value || '').trim().length > 0;

export const getTenantOnboardingHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenant = await getTenantById(tenantId, ownerAccountId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    return res.status(200).json({
      status: tenant.onboarding_status || 'pending',
      completed_at: tenant.onboarding_completed_at || null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch onboarding status', error: error.message });
  }
};

export const completeTenantOnboardingHandler = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const ownerAccountId = req.tenant?.ownerAccountId;

    if (!tenantId || !ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [tenant, profile, documents] = await Promise.all([
      getTenantById(tenantId, ownerAccountId),
      getOrCreateTenantProfile(tenantId, ownerAccountId),
      getTenantDocuments(tenantId, ownerAccountId)
    ]);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const missing = [];

    if (!hasValue(profile.permanent_address)) missing.push('permanent_address');
    if (!hasValue(profile.occupation_type)) missing.push('occupation_type');
    if (!hasValue(profile.emergency_contact_name)) missing.push('emergency_contact_name');
    if (!hasValue(profile.emergency_contact_phone)) missing.push('emergency_contact_phone');
    if (!hasValue(profile.emergency_contact_relation)) missing.push('emergency_contact_relation');
    if (!hasValue(profile.id_proof_type)) missing.push('id_proof_type');
    if (!hasValue(profile.pan_number)) missing.push('pan_number');
    if (!hasValue(profile.secondary_id_type)) missing.push('secondary_id_type');

    const requiredDocumentTypes = new Set([
      String(profile.id_proof_type || '').toLowerCase(),
      'pan',
      String(profile.secondary_id_type || '').toLowerCase()
    ].filter(Boolean));

    const uploadedTypes = new Set((documents || []).map((doc) => String(doc.document_type || '').toLowerCase()));
    const missingDocuments = Array.from(requiredDocumentTypes).filter((type) => !uploadedTypes.has(type));

    if (missingDocuments.length) {
      missing.push(`documents:${missingDocuments.join(',')}`);
    }

    if (missing.length) {
      return res.status(400).json({
        message: 'Onboarding details are incomplete',
        missing
      });
    }

    const onboardingUpdates = {
      ...tenant,
      onboarding_status: 'completed',
      onboarding_completed_at: new Date()
    };
    delete onboardingUpdates._id;

    const updated = await updateTenant(tenantId, ownerAccountId, onboardingUpdates);

    return res.status(200).json({
      status: updated?.onboarding_status || 'completed',
      completed_at: updated?.onboarding_completed_at || new Date()
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to complete onboarding', error: error.message });
  }
};
