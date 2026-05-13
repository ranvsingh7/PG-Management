import mongoose from 'mongoose';

const tenantSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    login_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    building_id: { type: String, required: true, index: true },
    room_number: { type: String, required: true },
    check_in_date: { type: String, required: true },
    check_out_date: { type: String, default: null },
    rent: { type: Number, required: true },
    advance_rent_amount: { type: Number, default: 0 },
    security_deposit_amount: { type: Number, default: 0 },
    check_in_total_due: { type: Number, default: 0 },
    check_in_payment_status: { type: String, default: 'pending', enum: ['pending', 'paid'] },
    status: { type: String, required: true, enum: ['active', 'inactive'] },
    agreement: { type: String, default: null },
    approval_status: { type: String, default: 'approved' },
    pg_id: { type: String, default: null },
    password_hash: { type: String, default: null },
    login_last_changed_at: { type: Date, default: null },
    last_login_at: { type: Date, default: null },
    onboarding_status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'completed']
    },
    onboarding_completed_at: { type: Date, default: null },
    owner_account_id: { type: String, required: true, index: true },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_by: { type: String, default: null },
    updated_at: { type: Date, default: null },
    moving_history: { type: [Object], default: [] }
  },
  {
    versionKey: false
  }
);

tenantSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.password_hash;
    return ret;
  }
});


const Tenant = mongoose.model('Tenant', tenantSchema);

export default Tenant;
