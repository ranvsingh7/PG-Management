import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    invoice_number: { type: String, required: true, unique: true, index: true },
    tenant_id: { type: String, required: true, index: true },
    tenant_name: { type: String, required: true },
    building_id: { type: String, required: true, index: true },
    building_name: { type: String, required: true },
    room_number: { type: String, required: true },
    invoice_type: {
      type: String,
      required: true,
      enum: ['rent', 'security_deposit'],
      default: 'rent',
      index: true
    },
    period: { type: String, required: true, index: true },
    rent_amount: { type: Number, required: true, min: 0, default: 0 },
    electricity_amount: { type: Number, required: true, min: 0, default: 0 },
    security_deposit_amount: { type: Number, default: 0, min: 0 },
    security_deposit_paid_amount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    paid_amount: { type: Number, default: 0, min: 0 },
    outstanding_amount: { type: Number, required: true, min: 0 },
    payment_history: {
      type: [
        {
          id: { type: String, required: true },
          amount: { type: Number, required: true, min: 0 },
          paid_total: { type: Number, required: true, min: 0 },
          paid_at: { type: Date, required: true },
          method: { type: String, default: 'cash' },
          status: { type: String, enum: ['success', 'failed'], default: 'success' },
          note: { type: String, default: '' },
          created_by_admin_id: { type: String, default: '' },
          created_by_name: { type: String, default: '' }
        }
      ],
      default: []
    },
    due_date: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'partial', 'overdue'],
      default: 'pending'
    },
    is_first_invoice: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  {
    versionKey: false
  }
);

invoiceSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

invoiceSchema.index({ owner_account_id: 1, period: 1, tenant_id: 1, invoice_type: 1 }, { unique: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
