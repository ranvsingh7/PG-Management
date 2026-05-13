import mongoose from 'mongoose';

const tenantProfileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    tenant_id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    permanent_address: { type: String, default: '' },
    occupation_type: { type: String, default: '' },
    occupation_details: { type: String, default: '' },
    emergency_contact_name: { type: String, default: '' },
    emergency_contact_phone: { type: String, default: '' },
    emergency_contact_relation: { type: String, default: '' },
    id_proof_type: { type: String, default: '' },
    id_proof_number: { type: String, default: '' },
    pan_number: { type: String, default: '' },
    secondary_id_type: { type: String, default: '' },
    secondary_id_number: { type: String, default: '' },
    updated_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

tenantProfileSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const TenantProfile = mongoose.model('TenantProfile', tenantProfileSchema);

export default TenantProfile;
