import mongoose from 'mongoose';

const tenantNoticeSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    tenant_id: { type: String, required: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    notice_date: { type: String, required: true },
    vacate_date: { type: String, required: true },
    reason: { type: String, default: '' },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  { versionKey: false }
);

tenantNoticeSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const TenantNotice = mongoose.model('TenantNotice', tenantNoticeSchema);

export default TenantNotice;
