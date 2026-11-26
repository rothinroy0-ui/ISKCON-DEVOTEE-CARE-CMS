const express = require('express');
const { hashPassword } = require('../auth');
const { logAudit } = require('../db');

function createUserRoutes(db, { requireAuth, requireRole }) {
  const router = express.Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/', async (_req, res, next) => {
    try {
      const result = await db.query(
        'SELECT id, name, username, email, role, is_active, created_at, updated_at FROM users ORDER BY id ASC'
      );
      res.json({ users: result.rows });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { name, username, email, password, role } = req.body || {};
      if (!name || !username || !password) {
        return res.status(400).json({ error: 'Name, username, and password are required' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      const validRole = ['admin', 'editor', 'viewer'].includes(role) ? role : 'editor';

      const existing = await db.query('SELECT id FROM users WHERE username = $1', [cleanUsername]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const inserted = await db.query(
        `INSERT INTO users (name, username, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, name, username, email, role, is_active, created_at, updated_at`,
        [
          String(name).trim(),
          cleanUsername,
          email ? String(email).trim() : null,
          hashPassword(String(password)),
          validRole,
        ]
      );
      const created = inserted.rows[0];

      await logAudit(db, req.user, 'CREATE_USER', 'user', created.id, `Created user ${created.username} (${created.role})`);
      res.status(201).json({ user: created });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const existingRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      const existing = existingRes.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { name, email, role, is_active, password } = req.body || {};
      const nextName = name !== undefined ? String(name).trim() : existing.name;
      const nextEmail = email !== undefined ? (email ? String(email).trim() : null) : existing.email;
      const nextRole = role && ['admin', 'editor', 'viewer'].includes(role) ? role : existing.role;
      const nextActive = is_active !== undefined ? Boolean(is_active) : existing.is_active;

      if (userId === req.user.id && !nextActive) {
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
      }
      if (userId === req.user.id && nextRole !== 'admin') {
        return res.status(400).json({ error: 'You cannot remove your own admin role' });
      }

      let nextHash = existing.password_hash;
      if (password && String(password).trim().length > 0) {
        if (String(password).length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        nextHash = hashPassword(String(password));
      }

      const updatedRes = await db.query(
        `UPDATE users
         SET name = $1, email = $2, role = $3, is_active = $4, password_hash = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING id, name, username, email, role, is_active, created_at, updated_at`,
        [nextName, nextEmail, nextRole, nextActive, nextHash, userId]
      );
      const updated = updatedRes.rows[0];

      await logAudit(db, req.user, 'UPDATE_USER', 'user', userId, `Updated user ${updated.username} (${updated.role})`);
      res.json({ user: updated });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      if (userId === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      const existingRes = await db.query('SELECT id, username FROM users WHERE id = $1', [userId]);
      const existing = existingRes.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }

      await db.query('DELETE FROM users WHERE id = $1', [userId]);
      await logAudit(db, req.user, 'DELETE_USER', 'user', userId, `Deleted user ${existing.username}`);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createUserRoutes;
