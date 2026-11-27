require('dotenv').config();
const express = require('express');
const compression = require('compression');
const fs = require('node:fs');
const path = require('node:path');
const { initDb } = require('./db');
const { ensureRecycleBinSchema } = require('./recycleBinMigration');
const { warmDevoteeCache } = require('./devoteeCache');
const { createAuthMiddleware } = require('./auth');
const createAuthRoutes = require('./routes/auth');
const createUserRoutes = require('./routes/users');
const createDevoteeRoutes = require('./routes/devotees');
const createAnalyticsRoutes = require('./routes/analytics');

const PORT = Number(process.env.PORT) || 4000;

let appPromise = null;

async function createApp() {
  const db = await initDb();
  await ensureRecycleBinSchema(db);
  const authMiddleware = createAuthMiddleware(db);

  // Keep the devotee cache warm on long-running servers. Serverless functions
  // are short-lived, so they rely on the per-invocation read instead.
  if (!process.env.VERCEL) {
    warmDevoteeCache(db);
    const refresher = setInterval(() => warmDevoteeCache(db), 120000);
    if (typeof refresher.unref === 'function') refresher.unref();
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', async (_req, res, next) => {
    try {
      await db.query('SELECT 1');
      res.json({ ok: true, database: 'postgresql', timestamp: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/auth', createAuthRoutes(db, authMiddleware));
  app.use('/api/users', createUserRoutes(db, authMiddleware));
  app.use('/api/devotees', createDevoteeRoutes(db, authMiddleware));
  app.use('/api/analytics', createAnalyticsRoutes(db, authMiddleware));

  app.get('/api/settings/marquee', authMiddleware.requireAuth, async (_req, res, next) => {
    try {
      const r = await db
        .query("SELECT value FROM portal_settings WHERE key = 'marquee_config'")
        .catch(() => ({ rows: [] }));
      const defaults = {
        enabled: true,
        text: 'Hare Krishna! Welcome to ISKCON Durgapur (RADHAPUR Devotee Care) — Devotee Management System Portal.',
        behavior: 'scroll',
        speed: 'normal',
      };
      if (r.rows.length === 0) {
        return res.json({ marquee: defaults });
      }
      try {
        const parsed = JSON.parse(r.rows[0].value);
        return res.json({ marquee: { ...defaults, ...parsed } });
      } catch {
        return res.json({ marquee: defaults });
      }
    } catch (err) {
      next(err);
    }
  });

  app.put(
    '/api/settings/marquee',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission('devotees_edit', 'bulk_fix'),
    async (req, res, next) => {
      try {
        const { enabled = true, text = '', behavior = 'scroll', speed = 'normal' } = req.body || {};
        const marquee = {
          enabled: Boolean(enabled),
          text: String(text || '').trim(),
          behavior: ['scroll', 'alternate'].includes(behavior) ? behavior : 'scroll',
          speed: ['slow', 'normal', 'fast'].includes(speed) ? speed : 'normal',
        };
        await db.query(
          `INSERT INTO portal_settings (key, value, updated_by, updated_at)
           VALUES ('marquee_config', $1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
          [JSON.stringify(marquee), req.user.name || req.user.username]
        );
        res.json({ ok: true, marquee });
      } catch (err) {
        next(err);
      }
    }
  );

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (!process.env.VERCEL && fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        etag: true,
        lastModified: true,
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  return app;
}

function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

if (require.main === module) {
  getApp()
    .then((app) => {
      app.listen(PORT, () => {
        console.log(`CMS Portal server running at http://localhost:${PORT} (PostgreSQL)`);
      });
    })
    .catch((err) => {
      console.error('Failed to start CMS Portal server:', err.message);
      process.exit(1);
    });
}

module.exports = { createApp, getApp };
