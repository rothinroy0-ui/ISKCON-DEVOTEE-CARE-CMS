require('dotenv').config();
const { signToken } = require('./server/auth');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
  max: 2,
});

const BASE = 'http://localhost:4100';
const DEVOTEE_CODE = 'TEST_RECYCLE_001';

async function req(path, { token, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

(async () => {
  const out = {};
  const baseline = (await pool.query('SELECT COUNT(*)::int AS n FROM devotee_data')).rows[0].n;
  out.baselineDevotees = baseline;

  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'devotee_data' AND column_name IN ('deleted_at','deleted_by_name')
      ORDER BY column_name`
  );
  out.migrationColumns = cols.rows.map((r) => r.column_name);

  const admin = await pool.query("SELECT id, role, name FROM users WHERE role='admin' ORDER BY id LIMIT 1");
  const token = signToken({ id: admin.rows[0].id, role: admin.rows[0].role });

  // Clean up any leftover from a previous failed run.
  const leftover = await pool.query('SELECT id FROM devotee_data WHERE devotee_id = $1', [DEVOTEE_CODE]);
  for (const row of leftover.rows) {
    await pool.query('DELETE FROM devotee_birthday_wishes WHERE devotee_id = $1', [String(row.id)]);
    await pool.query('DELETE FROM devotee_data WHERE id = $1', [row.id]);
  }

  const created = await req('/api/devotees', {
    token,
    method: 'POST',
    body: {
      devotee_id: DEVOTEE_CODE,
      full_name: 'Recycle Bin Test Devotee',
      contact_no: '9000000001',
      dob: '1990-01-15',
      gender: 'Male',
      town_city: 'Durgapur',
    },
  });
  out.create = { status: created.status, id: created.json?.devotee?.id, code: created.json?.devotee?.devotee_id };
  const id = created.json?.devotee?.id;

  // Add a wish so we can prove related data is restored too.
  const wish = await req(`/api/devotees/${id}/wish`, {
    token,
    method: 'POST',
    body: { wished: true, channel: 'Call/Message' },
  });
  out.wish = { status: wish.status };

  const beforeDelete = await req(`/api/devotees?search=${DEVOTEE_CODE}&limit=10`, { token });
  out.visibleBeforeDelete = beforeDelete.json?.devotees?.length;

  const del = await req(`/api/devotees/${id}`, { token, method: 'DELETE' });
  out.softDelete = { status: del.status, recycled: del.json?.recycled };

  const afterDelete = await req(`/api/devotees?search=${DEVOTEE_CODE}&limit=10`, { token });
  out.visibleAfterDelete = afterDelete.json?.devotees?.length;

  const bin = await req('/api/devotees/recycle-bin', { token });
  const binEntry = (bin.json?.devotees || []).find((d) => d.id === id);
  out.inRecycleBin = binEntry
    ? { full_name: binEntry.full_name, deleted_by: binEntry.deleted_by_name, wish_count: binEntry.wish_count }
    : null;

  const restore = await req(`/api/devotees/recycle-bin/${id}/restore`, { token, method: 'POST' });
  out.restore = { status: restore.status };

  const afterRestore = await req(`/api/devotees?search=${DEVOTEE_CODE}&limit=10`, { token });
  const restored = (afterRestore.json?.devotees || []).find((d) => d.id === id);
  out.restored = restored
    ? { full_name: restored.full_name, wished_this_year: restored.wished_this_year }
    : null;

  // Delete again and permanently remove the test record.
  await req(`/api/devotees/${id}`, { token, method: 'DELETE' });
  const purge = await req(`/api/devotees/recycle-bin/${id}`, { token, method: 'DELETE' });
  out.purge = { status: purge.status };

  const afterPurge = await req('/api/devotees/recycle-bin', { token });
  out.stillInBin = (afterPurge.json?.devotees || []).some((d) => d.id === id);
  out.finalDevotees = (await pool.query('SELECT COUNT(*)::int AS n FROM devotee_data')).rows[0].n;
  out.finalWishesForTest = (
    await pool.query('SELECT COUNT(*)::int AS n FROM devotee_birthday_wishes WHERE devotee_id = $1', [String(id)])
  ).rows[0].n;

  console.log(JSON.stringify(out, null, 2));
  await pool.end();
})().catch(async (e) => {
  console.error('RECYCLE_TEST_FAILED:', e.stack || e.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
