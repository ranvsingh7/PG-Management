import jwt from 'jsonwebtoken';

const jwtSecret = process.env.AUTH_JWT_SECRET || 'dev_auth_secret_change_me';

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
};

export const authenticateAdmin = (req, res, next) => {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, jwtSecret);

    req.admin = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      accountOwnerId: decoded.account_owner_id || decoded.sub
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
