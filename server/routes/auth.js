const express = require('express');
const { verifyPassword, hashPassword, signToken, resolvePermissions } = require('../auth');
const { logAudit } = require('../db');

function createAuthRoutes(db, { requireAuth }) {
  const router = express.Router();

  router.post('/login', async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const result = await db.query(
        'SELECT id, name, username, email, password_hash, role, permissions, is_active FROM users WHERE username = $1',
        [String(username).trim().toLowerCase()]
      );
      const user = result.rows[0];

      if (!user || !verifyPassword(String(password), user.password_hash)) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Your account is deactivated. Contact admin.' });
      }

      const token = signToken({ id: user.id, role: user.role });
      await logAudit(db, user, 'LOGIN', 'user', user.id, 'User logged in');

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: resolvePermissions(user),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  router.post('/change-password', requireAuth, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ error: 'Current password and new password (min 6 chars) are required' });
      }

      const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const row = result.rows[0];
      if (!row || !verifyPassword(String(currentPassword), row.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        hashPassword(String(newPassword)),
        req.user.id,
      ]);
      await logAudit(db, req.user, 'CHANGE_PASSWORD', 'user', req.user.id, 'Password updated');
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createAuthRoutes;
