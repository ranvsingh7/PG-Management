import mongoose from 'mongoose';

const tenantDocumentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    tenant_id: { type: String, required: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    document_type: { type: String, required: true },
    provider: { type: String, default: 'cloudinary' },
    public_id: { type: String, default: '' },
    secure_url: { type: String, default: '' },
    resource_type: { type: String, default: 'image' },
    file_name: { type: String, default: '' },
    status: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
    uploaded_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  { versionKey: false }
);

tenantDocumentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const TenantDocument = mongoose.model('TenantDocument', tenantDocumentSchema);

export default TenantDocument;
