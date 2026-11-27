// Short-lived in-memory cache for the devotee dataset.
//
// The database lives on a remote host, so transferring all ~800 devotee rows is
// the dominant cost of most requests. A short cache lets search, filters,
// pagination and navigation reuse a single fetch while every write endpoint
// invalidates it immediately (see the router-level hook in routes/devotees.js).
// A background refresher keeps it warm between requests.
//
// The cached data is not user-specific: every authenticated role can read the
// same devotee records, and per-user auth is still enforced by requireAuth.

// Long-running servers keep a warm cache (refreshed in the background), while
// serverless instances are many and independent, so they use a short TTL to
// avoid serving data that another instance already invalidated.
const TTL_MS = process.env.VERCEL ? 15000 : 180000;

let cache = { year: null, at: 0, rows: null };

const COMBINED_SQL = `
  SELECT d.*,
         w.wish_year       AS wish_year,
         w.channel         AS wish_channel,
         w.gift_status     AS wish_gift_status,
         w.wished_at       AS wish_wished_at,
         p.gift_status     AS parcel_gift_status,
         COALESCE(r.categories, ARRAY[]::text[]) AS removed_categories
    FROM devotee_data d
    LEFT JOIN devotee_birthday_wishes w
      ON w.devotee_id = d.id::text AND w.wish_year = $1
    LEFT JOIN parcels p
      ON p.devotee_id = d.id AND p.parcel_year = $1
    LEFT JOIN LATERAL (
      SELECT array_agg(rr.category) AS categories
        FROM devotee_removals rr
       WHERE rr.devotee_id = d.id
    ) r ON TRUE
   ORDER BY d.devotee_id ASC`;

async function getDevoteeRows(db, year) {
  const now = Date.now();
  if (cache.rows && cache.year === year && now - cache.at < TTL_MS) {
    return cache.rows;
  }
  const result = await db.query(COMBINED_SQL, [year]);
  cache = { year, at: now, rows: result.rows };
  return result.rows;
}

// Force a refresh. Used on startup and by the background refresher so the
// first request after an idle period does not pay the full remote fetch.
async function warmDevoteeCache(db, year = new Date().getFullYear()) {
  try {
    const result = await db.query(COMBINED_SQL, [year]);
    cache = { year, at: Date.now(), rows: result.rows };
    return true;
  } catch {
    return false;
  }
}

function invalidateDevoteeCache() {
  cache = { year: null, at: 0, rows: null };
}

module.exports = { getDevoteeRows, warmDevoteeCache, invalidateDevoteeCache };
