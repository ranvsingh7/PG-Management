import mongoose from 'mongoose';

const pendingApprovalSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    applicant_name: { type: String, required: true },
    approval_type: { type: String, required: true, enum: ['tenant', 'staff', 'booking', 'other'] },
    request_note: { type: String, default: '' },
    submitted_date: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewed_date: { type: String, default: null },
    reviewed_by: { type: String, default: null },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  { versionKey: false }
);

pendingApprovalSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const PendingApproval = mongoose.model('PendingApproval', pendingApprovalSchema);

export default PendingApproval;
