import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    tenant_id: { type: String, default: '' },
    building_id: { type: String, default: '' },
    building_name: { type: String, default: '' },
    visitor_name: { type: String, required: true },
    phone: { type: String, default: '' },
    purpose: { type: String, required: true },
    tenant_name: { type: String, default: '' },
    room_number: { type: String, default: '' },
    check_in_at: { type: Date, required: true },
    check_out_at: { type: Date, default: null },
    status: { type: String, required: true, enum: ['checked_in', 'checked_out'], default: 'checked_in' },
    notes: { type: String, default: '' },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  { versionKey: false }
);

visitorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const Visitor = mongoose.model('Visitor', visitorSchema);

export default Visitor;
