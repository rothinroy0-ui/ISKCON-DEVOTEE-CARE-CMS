const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

function getSecret() {
  if (process.env.CMS_SECRET) return process.env.CMS_SECRET;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(SECRET_FILE)) {
      return fs.readFileSync(SECRET_FILE, 'utf8').trim();
    }
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, secret, 'utf8');
    return secret;
  } catch {
    return crypto
      .createHmac('sha256', 'iskcon-cms-portal-secret')
      .update(process.env.DATABASE_URL || 'fallback')
      .digest('hex');
  }
}

const SECRET = getSecret();

const ALL_PERMISSIONS = [
  'dashboard',
  'devotees',
  'devotees_edit',
  'birthdays',
  'anniversaries',
  'parcels',
  'removals',
  'applications',
  'bulk_fix',
  'insights',
  'users',
];

const DEFAULT_PERMISSIONS_BY_ROLE = {
  admin: [...ALL_PERMISSIONS],
  editor: [
    'dashboard',
    'devotees',
    'devotees_edit',
    'birthdays',
    'anniversaries',
    'parcels',
    'removals',
  ],
  viewer: [
    'dashboard',
    'devotees',
    'birthdays',
    'anniversaries',
    'parcels',
    'removals',
  ],
};

function resolvePermissions(user) {
  if (!user) return [];
  if (user.role === 'admin' && !user.permissions) {
    return [...ALL_PERMISSIONS];
  }
  if (Array.isArray(user.permissions)) {
    return user.permissions.filter((p) => ALL_PERMISSIONS.includes(p));
  }
  if (typeof user.permissions === 'string' && user.permissions.trim()) {
    try {
      const parsed = JSON.parse(user.permissions);
      if (Array.isArray(parsed)) {
        return parsed.filter((p) => ALL_PERMISSIONS.includes(p));
      }
    } catch {
      // ignore invalid JSON
    }
  }
  return DEFAULT_PERMISSIONS_BY_ROLE[user.role] || DEFAULT_PERMISSIONS_BY_ROLE.viewer;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = String(storedHash || '').split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signToken(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function createAuthMiddleware(db) {
  async function requireAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : (req.query.token || '').trim();

      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const payload = verifyToken(token);
      if (!payload || !payload.id) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const result = await db.query(
        'SELECT id, name, username, email, role, permissions, is_active FROM users WHERE id = $1',
        [payload.id]
      );
      const user = result.rows[0];

      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Account is disabled or not found' });
      }

      req.user = {
        ...user,
        permissions: resolvePermissions(user),
      };
      next();
    } catch (err) {
      next(err);
    }
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'You do not have permission for this action' });
      }
      next();
    };
  }

  function requirePermission(...perms) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      if (req.user.role === 'admin') {
        return next();
      }
      const userPerms = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      if (!perms.some((p) => userPerms.includes(p))) {
        return res.status(403).json({ error: 'You do not have permission for this action' });
      }
      next();
    };
  }

  return { requireAuth, requireRole, requirePermission };
}

module.exports = {
  ALL_PERMISSIONS,
  DEFAULT_PERMISSIONS_BY_ROLE,
  resolvePermissions,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  createAuthMiddleware,
};
