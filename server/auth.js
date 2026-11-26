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
    return crypto.randomBytes(32).toString('hex');
  }
}

const SECRET = getSecret();

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
        'SELECT id, name, username, email, role, is_active FROM users WHERE id = $1',
        [payload.id]
      );
      const user = result.rows[0];

      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Account is disabled or not found' });
      }

      req.user = user;
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

  return { requireAuth, requireRole };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  createAuthMiddleware,
};
