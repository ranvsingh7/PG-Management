import Admin from '../models/admin.model.js';

export const getAdminByEmail = async (email) => Admin.findOne({ email }).lean();

export const getAdminById = async (id) => Admin.findOne({ id }).lean();

export const getAdminByGoogleSub = async (googleSub) =>
  Admin.findOne({ google_sub: googleSub }).lean();

export const getAdminsByAccountOwnerId = async (accountOwnerId) =>
  Admin.find({ account_owner_id: accountOwnerId }).sort({ created_at: -1 }).lean();

export const countAdminsByAccountOwnerId = async (accountOwnerId) =>
  Admin.countDocuments({ account_owner_id: accountOwnerId });

export const createAdmin = async (admin) => {
  const created = await Admin.create(admin);
  return created.toJSON();
};

export const updateAdmin = async (id, payload) => {
  const updated = await Admin.findOneAndUpdate({ id }, payload, {
    new: true,
    runValidators: true
  });

  return updated ? updated.toJSON() : null;
};
