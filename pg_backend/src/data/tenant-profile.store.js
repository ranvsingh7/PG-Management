import { v4 as uuidv4 } from 'uuid';
import TenantProfile from '../models/tenant-profile.model.js';

const defaultProfile = (tenantId, ownerAccountId) => ({
  id: uuidv4(),
  tenant_id: tenantId,
  owner_account_id: ownerAccountId,
  permanent_address: '',
  occupation_type: '',
  occupation_details: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  id_proof_type: '',
  id_proof_number: '',
  pan_number: '',
  secondary_id_type: '',
  secondary_id_number: '',
  updated_at: new Date()
});

export const getOrCreateTenantProfile = async (tenantId, ownerAccountId) => {
  let profile = await TenantProfile.findOne({ tenant_id: tenantId, owner_account_id: ownerAccountId }).lean();

  if (!profile) {
    const created = await TenantProfile.create(defaultProfile(tenantId, ownerAccountId));
    profile = created.toJSON();
  }

  return profile;
};

export const updateTenantProfile = async (tenantId, ownerAccountId, updates) => {
  const updated = await TenantProfile.findOneAndUpdate(
    { tenant_id: tenantId, owner_account_id: ownerAccountId },
    { ...updates, updated_at: new Date() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return updated.toJSON();
};
