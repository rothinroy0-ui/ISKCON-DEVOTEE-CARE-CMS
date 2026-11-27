const { Pool } = require('pg');
const { hashPassword } = require('./auth');

function createPool() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Create a .env file (see .env.example) with your PostgreSQL connection string.'
    );
  }

  const isServerless = Boolean(process.env.VERCEL);
  if (isServerless && connectionString.includes('pooler.supabase.com:5432')) {
    connectionString = connectionString.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543');
  }

  const isLocal =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const useSsl =
    process.env.PG_SSL === 'true' ||
    (process.env.PG_SSL !== 'false' && !isLocal);

  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: isServerless ? 1 : 2,
    // Serverless functions are short-lived, so release connections quickly.
    // Long-running servers benefit from reusing warm connections instead of
    // paying a fresh TLS handshake to the remote database on every request.
    idleTimeoutMillis: isServerless ? 3000 : 30000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: isServerless,
    keepAlive: true,
  });
}

async function initDb() {
  const pool = createPool();

  const schemaCheck = await pool
    .query("SELECT to_regclass('public.parcels') AS tbl")
    .catch(() => ({ rows: [{ tbl: null }] }));

  if (schemaCheck.rows[0]?.tbl) {
    return pool;
  }

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

    CREATE TABLE IF NOT EXISTS devotee_removals (
      id SERIAL PRIMARY KEY,
      devotee_id INTEGER NOT NULL REFERENCES devotee_data(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('birthday', 'anniversary', 'parcel')),
      reason TEXT,
      removed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      removed_by_name TEXT,
      removed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(devotee_id, category)
    );

    CREATE TABLE IF NOT EXISTS parcels (
      id SERIAL PRIMARY KEY,
      devotee_id INTEGER NOT NULL REFERENCES devotee_data(id) ON DELETE CASCADE,
      devotee_code TEXT,
      full_name TEXT,
      contact_no TEXT,
      town_city TEXT,
      full_address TEXT,
      parcel_year INTEGER NOT NULL,
      gift_status TEXT NOT NULL DEFAULT 'none' CHECK(gift_status IN ('none', 'packed', 'in_transit', 'delivered')),
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_by_name TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(devotee_id, parcel_year)
    );

    ALTER TABLE devotee_data ADD COLUMN IF NOT EXISTS devotee_id TEXT;
    ALTER TABLE devotee_data ADD COLUMN IF NOT EXISTS sl_no INTEGER;
    ALTER TABLE devotee_birthday_wishes ADD COLUMN IF NOT EXISTS gift_status TEXT NOT NULL DEFAULT 'none';
    CREATE INDEX IF NOT EXISTS idx_wishes_year ON devotee_birthday_wishes(wish_year);
    CREATE INDEX IF NOT EXISTS idx_devotee_data_devotee_id ON devotee_data(devotee_id);
    CREATE INDEX IF NOT EXISTS idx_devotee_removals_category ON devotee_removals(category);
    CREATE INDEX IF NOT EXISTS idx_parcels_year ON parcels(parcel_year);
  `);

  await pool.query(`
    INSERT INTO parcels (
      devotee_id, devotee_code, full_name, contact_no, town_city, full_address,
      parcel_year, gift_status, updated_by, updated_at
    )
    SELECT
      d.id,
      d.devotee_id,
      d.full_name,
      COALESCE(d.contact_no::text, ''),
      d.town_city,
      d.full_address,
      w.wish_year,
      w.gift_status,
      w.wished_by,
      w.wished_at
    FROM devotee_birthday_wishes w
    JOIN devotee_data d ON d.id::text = w.devotee_id
    WHERE w.gift_status IS NOT NULL AND w.gift_status <> 'none'
    ON CONFLICT (devotee_id, parcel_year) DO NOTHING;
  `);

  await pool.query(`
    UPDATE devotee_data
    SET devotee_id = 'ISKCON_DGP_' || LPAD(id::text, 3, '0')
    WHERE devotee_id IS NULL OR devotee_id = '';

    UPDATE devotee_data
    SET sl_no = sub.rn
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) AS rn
      FROM devotee_data
    ) sub
    WHERE devotee_data.id = sub.id AND devotee_data.sl_no IS NULL;
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
