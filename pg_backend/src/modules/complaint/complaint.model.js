import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    tenant_name: { type: String, required: true },
    room_number: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['maintenance', 'electricity', 'cleaning', 'security', 'other']
    },
    priority: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    description: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open'
    },
    complaint_date: { type: String, required: true },
    resolved_date: { type: String, default: null },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  {
    versionKey: false
  }
);

complaintSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
