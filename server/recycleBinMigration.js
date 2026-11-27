// Additive schema for the Recycle Bin feature.
//
// Deletes are soft: a devotee row is marked with deleted_at instead of being
// removed, so the record and all of its wishes/parcels/removal entries can be
// restored exactly as they were. The migration is idempotent and runs on every
// server start so existing databases pick up the new columns automatically.

async function ensureRecycleBinSchema(db) {
  await db.query(`
    ALTER TABLE devotee_data ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE devotee_data ADD COLUMN IF NOT EXISTS deleted_by_name TEXT;
    CREATE INDEX IF NOT EXISTS idx_devotee_data_deleted_at ON devotee_data(deleted_at);
  `);
}

module.exports = { ensureRecycleBinSchema };
