import mongoose from 'mongoose';

const buildingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    property_code: { type: String, default: '' },
    address: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    total_floors: { type: Number, required: true },
    total_rooms: { type: Number, required: true },
    caretaker_name: { type: String, default: '' },
    caretaker_phone: { type: String, default: '' },
    amenities: { type: [String], default: [] },
    security_deposit: { type: Number, default: 0 },
    electricity_rate: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
    owner_account_id: { type: String, required: true, index: true },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_by: { type: String, default: null },
    updated_at: { type: Date, default: null },
    total_beds: { type: Number, default: 0 },
    occupied_beds: { type: Number, default: 0 },
    available_beds: { type: Number, default: 0 },
    occupancy_percentage: { type: Number, default: 0 }
  },
  {
    versionKey: false
  }
);

buildingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

buildingSchema.index(
  { property_code: 1 },
  {
    unique: true,
    partialFilterExpression: { property_code: { $type: 'string', $ne: '' } }
  }
);

const Building = mongoose.model('Building', buildingSchema);

export default Building;
