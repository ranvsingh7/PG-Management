import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import {
  createAdmin,
  getAdminByEmail,
  getAdminByGoogleSub,
  getAdminsByAccountOwnerId,
  getAdminById,
  updateAdmin
} from '../data/admin.store.js';

const jwtSecret = process.env.AUTH_JWT_SECRET || 'dev_auth_secret_change_me';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(googleClientId || undefined);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (admin) =>
  jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role || 'admin',
      account_owner_id: admin.account_owner_id || admin.id
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

const sanitizeAdmin = (admin) => ({
  id: admin.id,
  full_name: admin.full_name,
  email: admin.email,
  provider: admin.provider,
  role: admin.role,
  account_owner_id: admin.account_owner_id,
  created_by_admin_id: admin.created_by_admin_id,
  status: admin.status,
  created_at: admin.created_at,
  last_login_at: admin.last_login_at
});

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
};

export const signupHandler = async (req, res) => {
  try {
    const fullName = String(req.body?.full_name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'full_name, email and password are required' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await getAdminByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Admin with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const adminId = uuidv4();

    const created = await createAdmin({
      id: adminId,
      full_name: fullName,
      email,
      password_hash: passwordHash,
      provider: 'local',
      google_sub: null,
      role: 'super_admin',
      account_owner_id: adminId,
      created_by_admin_id: adminId,
      status: 'active',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    });

    const token = signToken(created);

    return res.status(201).json({
      token,
      admin: sanitizeAdmin(created)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to sign up', error: error.message });
  }
};

export const loginHandler = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const admin = await getAdminByEmail(email);
    if (!admin || !admin.password_hash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const fallbackOwnerId = admin.account_owner_id || admin.id;
    const updated = await updateAdmin(admin.id, {
      last_login_at: new Date().toISOString(),
      account_owner_id: fallbackOwnerId,
      created_by_admin_id: admin.created_by_admin_id || admin.id
    });
    const token = signToken(updated || admin);

    return res.status(200).json({
      token,
      admin: sanitizeAdmin(updated || admin)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
};

export const googleAuthHandler = async (req, res) => {
  try {
    const idToken = String(req.body?.id_token || '').trim();

    if (!idToken) {
      return res.status(400).json({ message: 'id_token is required' });
    }

    if (!googleClientId) {
      return res.status(500).json({ message: 'GOOGLE_CLIENT_ID is not configured on server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId
    });

    const payload = ticket.getPayload();
    const email = String(payload?.email || '').toLowerCase();
    const fullName = String(payload?.name || '').trim() || 'Google Admin';
    const googleSub = String(payload?.sub || '');

    if (!email || !googleSub) {
      return res.status(400).json({ message: 'Invalid Google token payload' });
    }

    let admin = await getAdminByGoogleSub(googleSub);

    if (!admin) {
      const adminByEmail = await getAdminByEmail(email);

      if (adminByEmail) {
        admin = await updateAdmin(adminByEmail.id, {
          google_sub: googleSub,
          provider: adminByEmail.provider === 'local' ? 'local' : 'google',
          account_owner_id: adminByEmail.account_owner_id || adminByEmail.id,
          created_by_admin_id: adminByEmail.created_by_admin_id || adminByEmail.id,
          last_login_at: new Date().toISOString()
        });
      } else {
        const adminId = uuidv4();

        admin = await createAdmin({
          id: adminId,
          full_name: fullName,
          email,
          password_hash: null,
          provider: 'google',
          google_sub: googleSub,
          role: 'super_admin',
          account_owner_id: adminId,
          created_by_admin_id: adminId,
          status: 'active',
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        });
      }
    } else {
      admin = await updateAdmin(admin.id, {
        last_login_at: new Date().toISOString(),
        account_owner_id: admin.account_owner_id || admin.id,
        created_by_admin_id: admin.created_by_admin_id || admin.id
      });
    }

    const token = signToken(admin);

    return res.status(200).json({
      token,
      admin: sanitizeAdmin(admin)
    });
  } catch (error) {
    return res.status(401).json({ message: 'Google authentication failed', error: error.message });
  }
};

export const meHandler = async (req, res) => {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    const admin = await getAdminById(decoded.sub);

    if (!admin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(200).json({ admin: sanitizeAdmin(admin) });
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export const createAdminBySuperAdminHandler = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can create admin accounts' });
    }

    const fullName = String(req.body?.full_name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'full_name, email and password are required' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existing = await getAdminByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Admin with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await createAdmin({
      id: uuidv4(),
      full_name: fullName,
      email,
      password_hash: passwordHash,
      provider: 'local',
      google_sub: null,
      role: 'admin',
      account_owner_id: req.admin.accountOwnerId,
      created_by_admin_id: req.admin.id,
      status: 'active',
      created_at: new Date().toISOString(),
      last_login_at: null
    });

    return res.status(201).json({ admin: sanitizeAdmin(created) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create admin account', error: error.message });
  }
};

export const listAdminsByOwnerHandler = async (req, res) => {
  try {
    if (!req.admin || req.admin.role !== 'super_admin') {
      return res.status(403).json({ message: 'Only super admin can view admin list' });
    }

    const admins = await getAdminsByAccountOwnerId(req.admin.accountOwnerId);
    return res.status(200).json(admins.map((admin) => sanitizeAdmin(admin)));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch admin list', error: error.message });
  }
};
