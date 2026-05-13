import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getTenantById, getTenantByLoginId, updateTenant } from '../data/tenant.store.js';

const tenantJwtSecret = process.env.TENANT_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev_tenant_secret_change_me';

const signToken = (tenant) =>
  jwt.sign(
    {
      sub: tenant.id,
      owner_account_id: tenant.owner_account_id
    },
    tenantJwtSecret,
    { expiresIn: '7d' }
  );

const sanitizeTenant = (tenant) => ({
  id: tenant.id,
  login_id: tenant.login_id,
  name: tenant.name,
  email: tenant.email,
  phone: tenant.phone,
  building_id: tenant.building_id,
  room_number: tenant.room_number,
  status: tenant.status,
  onboarding_status: tenant.onboarding_status || 'pending',
  onboarding_completed_at: tenant.onboarding_completed_at || null
});

export const tenantLoginHandler = async (req, res) => {
  try {
    const loginId = String(req.body?.login_id || '').trim();
    const password = String(req.body?.password || '');

    if (!loginId || !password) {
      return res.status(400).json({ message: 'login_id and password are required' });
    }

    if (!/^\d{10}$/.test(loginId)) {
      return res.status(400).json({ message: 'login_id must be a 10 digit mobile number' });
    }

    const tenant = await getTenantByLoginId(loginId);
    if (!tenant || !tenant.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (tenant.status !== 'active') {
      return res.status(403).json({ message: 'Tenant account is inactive' });
    }

    const isMatch = await bcrypt.compare(password, tenant.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const loginUpdates = {
      ...tenant,
      last_login_at: new Date()
    };
    delete loginUpdates._id;

    const updated = await updateTenant(tenant.id, tenant.owner_account_id, loginUpdates);

    const token = signToken(updated || tenant);

    return res.status(200).json({
      token,
      tenant: sanitizeTenant(updated || tenant)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
};

export const tenantMeHandler = async (req, res) => {
  try {
    if (!req.tenant?.id || !req.tenant?.ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const tenant = await getTenantById(req.tenant.id, req.tenant.ownerAccountId);
    if (!tenant) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(200).json({ tenant: sanitizeTenant(tenant) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

export const tenantChangePasswordHandler = async (req, res) => {
  try {
    if (!req.tenant?.id || !req.tenant?.ownerAccountId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const currentPassword = String(req.body?.current_password || '');
    const newPassword = String(req.body?.new_password || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'current_password and new_password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'new_password must be at least 6 characters' });
    }

    const tenant = await getTenantById(req.tenant.id, req.tenant.ownerAccountId);
    if (!tenant || !tenant.password_hash) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const isMatch = await bcrypt.compare(currentPassword, tenant.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const passwordUpdates = {
      ...tenant,
      password_hash: passwordHash,
      login_last_changed_at: new Date()
    };
    delete passwordUpdates._id;

    const updated = await updateTenant(tenant.id, tenant.owner_account_id, passwordUpdates);

    return res.status(200).json({ tenant: sanitizeTenant(updated || tenant) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
};
