import mongoose from 'mongoose';

const invoiceSettingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, unique: true, index: true },
    due_day_of_month: { type: Number, default: 2, min: 1, max: 28 },
    updated_at: { type: Date, default: Date.now }
  },
  {
    versionKey: false
  }
);

invoiceSettingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const InvoiceSetting = mongoose.model('InvoiceSetting', invoiceSettingSchema);

export default InvoiceSetting;
