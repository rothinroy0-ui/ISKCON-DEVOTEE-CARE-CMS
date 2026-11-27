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
