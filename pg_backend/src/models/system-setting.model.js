import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    free_limits: {
      max_tenants: { type: Number, required: true, min: 0, default: 50 },
      max_buildings: { type: Number, required: true, min: 0, default: 2 },
      max_admins: { type: Number, required: true, min: 0, default: 2 },
      support: { type: String, default: 'community' }
    },
    updated_at: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

systemSettingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  }
});

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

export default SystemSetting;
