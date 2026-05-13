import jwt from 'jsonwebtoken';

const tenantJwtSecret = process.env.TENANT_JWT_SECRET || process.env.AUTH_JWT_SECRET || 'dev_tenant_secret_change_me';

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
};

export const authenticateTenant = (req, res, next) => {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, tenantJwtSecret);

    req.tenant = {
      id: decoded.sub,
      ownerAccountId: decoded.owner_account_id
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
