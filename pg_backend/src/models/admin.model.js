import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, default: null },
    provider: { type: String, default: 'local', enum: ['local', 'google'] },
    google_sub: { type: String, default: null, index: true },
    role: { type: String, default: 'admin' },
    account_owner_id: { type: String, required: true, index: true },
    created_by_admin_id: { type: String, default: null },
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now },
    last_login_at: { type: Date, default: null }
  },
  {
    versionKey: false
  }
);

adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.password_hash;
    return ret;
  }
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
