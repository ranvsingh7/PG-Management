import mongoose from 'mongoose';

const meterReadingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    owner_account_id: { type: String, required: true, index: true },
    building_id: { type: String, required: true, index: true },
    room_number: { type: String, required: true, index: true },
    tenant_id: { type: String, default: null, index: true },
    reading_type: {
      type: String,
      required: true,
      enum: ['check_in', 'month_end', 'manual'],
      default: 'month_end',
      index: true
    },
    period: { type: String, default: null, index: true },
    reading_value: { type: Number, required: true, min: 0 },
    reading_date: { type: Date, required: true },
    note: { type: String, default: '' },
    created_by: { type: String, default: 'admin' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: null }
  },
  {
    versionKey: false
  }
);

meterReadingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

meterReadingSchema.index({ owner_account_id: 1, building_id: 1, room_number: 1, period: 1, reading_type: 1 });
meterReadingSchema.index({ owner_account_id: 1, building_id: 1, room_number: 1, reading_date: -1 });

const MeterReading = mongoose.model('MeterReading', meterReadingSchema);

export default MeterReading;
