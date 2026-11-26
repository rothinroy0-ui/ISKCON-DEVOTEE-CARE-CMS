const { Pool } = require('pg');
const { hashPassword } = require('./auth');

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Create a .env file (see .env.example) with your PostgreSQL connection string.'
    );
  }

  const isLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const useSsl =
    process.env.PG_SSL === 'true' ||
    (process.env.PG_SSL !== 'false' && !isLocal);

  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

async function initDb() {
  const pool = createPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'editor', 'viewer')) DEFAULT 'editor',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS devotee_data (
      id SERIAL PRIMARY KEY,
      devotee_id TEXT,
      full_name TEXT,
      fathers_name TEXT,
      spouses_name TEXT,
      dob TEXT,
      gender TEXT,
      contact_no BIGINT,
      whatsapp_no BIGINT,
      blood_group TEXT,
      town_city TEXT,
      full_address TEXT,
      teacher_name TEXT,
      spiritual_master TEXT,
      initiated_name TEXT,
      first_initiation_date TEXT,
      second_initiation_date TEXT,
      anniversary_date TEXT,
      upload_your_passport_size_photo TEXT
    );

    CREATE TABLE IF NOT EXISTS devotee_birthday_wishes (
      id SERIAL PRIMARY KEY,
      devotee_id TEXT NOT NULL,
      wish_year INTEGER NOT NULL,
      wished_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      channel TEXT DEFAULT 'Call/Message',
      note TEXT,
      wished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(devotee_id, wish_year)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE devotee_data ADD COLUMN IF NOT EXISTS devotee_id TEXT;
    ALTER TABLE devotee_birthday_wishes ADD COLUMN IF NOT EXISTS gift_status TEXT NOT NULL DEFAULT 'none';
    CREATE INDEX IF NOT EXISTS idx_wishes_year ON devotee_birthday_wishes(wish_year);
    CREATE INDEX IF NOT EXISTS idx_devotee_data_devotee_id ON devotee_data(devotee_id);
  `);

  await pool.query(`
    UPDATE devotee_data
    SET devotee_id = 'ISKCON_DGP_' || LPAD(id::text, 3, '0')
    WHERE devotee_id IS NULL OR devotee_id = '';
  `);

  const userRes = await pool.query('SELECT COUNT(*)::int AS count FROM users');
  if (userRes.rows[0].count === 0) {
    await pool.query(
      'INSERT INTO users (name, username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
      ['System Admin', 'admin', 'admin@cmsportal.local', hashPassword('admin123'), 'admin']
    );
    await pool.query(
      'INSERT INTO users (name, username, email, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
      ['Seva Editor', 'editor', 'editor@cmsportal.local', hashPassword('editor123'), 'editor']
    );
  }

  return pool;
}

async function logAudit(db, user, action, entityType, entityId, details) {
  try {
    await db.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [user ? user.id : null, user ? user.name : 'System', action, entityType, entityId || null, details || '']
    );
  } catch {
    // Non-fatal
  }
}

module.exports = { initDb, logAudit };
