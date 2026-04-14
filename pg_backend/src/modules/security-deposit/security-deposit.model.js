import mongoose from 'mongoose';

const securityDepositSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    tenant_name: { type: String, required: true },
    room_number: { type: String, required: true },
    total_amount: { type: Number, required: true, min: 0 },
    collected_amount: { type: Number, required: true, min: 0, default: 0 },
    refundable_amount: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['held', 'partially_refunded', 'refunded'],
      default: 'held'
    },
    collected_date: { type: String, required: true },
    refund_date: { type: String, default: null },
    notes: { type: String, default: '' },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  { versionKey: false }
);

securityDepositSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const SecurityDeposit = mongoose.model('SecurityDeposit', securityDepositSchema);

export default SecurityDeposit;
