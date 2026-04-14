import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    building_id: { type: String, required: true, index: true },
    room_number: { type: String, required: true },
    floor: { type: Number, required: true },
    type: { type: String, required: true, enum: ['single', 'double', 'triple'] },
    capacity: { type: Number, required: true },
    electricity_reading: { type: Number, default: 0 },
    occupied: { type: Number, default: 0 },
    pre_booked: { type: Number, default: 0 },
    rent: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['vacant', 'occupied', 'partially_occupied', 'pre_booked']
    },
    owner_account_id: { type: String, required: true, index: true },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_by: { type: String, default: null },
    updated_at: { type: Date, default: null },
    pre_bookings: { type: [Object], default: [] },
    pre_bookings_count: { type: Number, default: 0 }
  },
  {
    versionKey: false
  }
);

roomSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
