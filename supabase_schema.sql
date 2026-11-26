-- ISKCON Durgapur CMS Portal — Supabase (PostgreSQL) Schema
-- Note: The Node.js server also creates these tables automatically on startup.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'editor',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devotees (
  id SERIAL PRIMARY KEY,
  devotee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  spiritual_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  dob TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')) DEFAULT 'Male',
  city TEXT,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Remove the legacy center column from existing databases
ALTER TABLE devotees DROP COLUMN IF EXISTS center;

CREATE TABLE IF NOT EXISTS birthday_wishes (
  id SERIAL PRIMARY KEY,
  devotee_id INTEGER NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  wish_year INTEGER NOT NULL,
  wished_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  channel TEXT DEFAULT 'Call/Message',
  note TEXT,
  wished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (devotee_id, wish_year)
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
