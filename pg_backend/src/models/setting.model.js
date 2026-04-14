import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    owner_account_id: { type: String, required: true, unique: true, index: true },
    property_name: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    contact_email: { type: String, default: '' },
    address: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    invoice_prefix: { type: String, default: 'INV' },
    updated_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

settingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const Setting = mongoose.model('Setting', settingSchema);

export default Setting;
