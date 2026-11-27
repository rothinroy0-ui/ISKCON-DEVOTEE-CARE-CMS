const express = require('express');
const { logAudit } = require('../db');
const { getDevoteeRows, invalidateDevoteeCache } = require('../devoteeCache');
const { computeBirthdayInfo, getLocalToday, parseDob } = require('../utils/birthday');

function normalizePhotoUrl(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  const driveMatch = s.match(/drive\.google\.com\/open\?id=([^&\s]+)/i) ||
    s.match(/drive\.google\.com\/file\/d\/([^/\s]+)/i);
  if (driveMatch) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w200`;
  }
  return s;
}

function parsePhoneBigint(val) {
  if (val === undefined || val === null || val === '') return null;
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return null;
  return digits;
}

function formatDobToIso(dobStr) {
  const parsed = parseDob(dobStr);
  if (!parsed) return '';
  return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
}

function enrichDevotee(row, wishedMap, refDate, removedMap = new Map(), parcelMap = new Map()) {
  const bday = computeBirthdayInfo(row.dob, refDate);
  const anniv = computeBirthdayInfo(row.anniversary_date, refDate);
  const phoneStr = row.contact_no ? String(row.contact_no) : '';
  const whatsappStr = row.whatsapp_no ? String(row.whatsapp_no) : '';
  const wishRow = wishedMap.get(String(row.id));
  const {
    upload_your_passport_size_photo,
    wish_year,
    wish_channel,
    wish_gift_status,
    wish_wished_at,
    parcel_gift_status,
    removed_categories: _joinedRemoved,
    deleted_at: _deletedAt,
    deleted_by_name: _deletedBy,
    ...rest
  } = row;
  return {
    ...rest,
    id: row.id,
    sl_no: row.sl_no ?? row.id,
    devotee_id: row.devotee_id || `ISKCON_DGP_${String(row.id).padStart(3, '0')}`,
    phone: phoneStr,
    contact_no: phoneStr,
    whatsapp_no: whatsappStr,
    city: row.town_city || '',
    address: row.full_address || '',
    spiritual_name: row.initiated_name || '',
    photo_url: normalizePhotoUrl(upload_your_passport_size_photo),
    dob_iso: formatDobToIso(row.dob),
    anniversary_iso: formatDobToIso(row.anniversary_date),
    anniversary_month: anniv.birth_month,
    anniversary_day: anniv.birth_day,
    anniversary_years: anniv.age,
    anniversary_next_years: anniv.turning_age,
    days_until_anniversary: anniv.days_until_birthday,
    is_anniversary_today: anniv.is_birthday_today,
    status: 'active',
    ...bday,
    wished_this_year: Boolean(wishRow && wishRow.channel !== 'GiftOnly'),
    gift_status: parcelMap.get(row.id) || wishRow?.gift_status || 'none',
    removed_categories: removedMap.get(row.id) || [],
  };
}

function createDevoteeRoutes(db, { requireAuth, requirePermission }) {
  const router = express.Router();
  router.use(requireAuth);

  // Any write invalidates the cached devotee dataset so reads stay fresh.
  router.use((req, res, next) => {
    if (req.method !== 'GET') {
      invalidateDevoteeCache();
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          invalidateDevoteeCache();
        }
      });
    }
    next();
  });

  async function getWishedSet(year) {
    const res = await db.query(
      'SELECT devotee_id, channel, gift_status FROM devotee_birthday_wishes WHERE wish_year = $1',
      [year]
    );
    return new Map(res.rows.map((r) => [String(r.devotee_id), r]));
  }

  async function getRemovedMap() {
    const res = await db.query('SELECT devotee_id, category FROM devotee_removals');
    const map = new Map();
    for (const r of res.rows) {
      const id = Number(r.devotee_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(r.category);
    }
    return map;
  }

  async function getParcelMap(year) {
    const res = await db
      .query('SELECT devotee_id, gift_status FROM parcels WHERE parcel_year = $1', [year])
      .catch(() => ({ rows: [] }));
    return new Map(res.rows.map((r) => [Number(r.devotee_id), r.gift_status]));
  }

  async function generateNextId() {
    const r = await db.query('SELECT devotee_id FROM devotee_data');
    let maxNum = 0;
    for (const row of r.rows) {
      const m = String(row.devotee_id || '').match(/(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (n > maxNum) maxNum = n;
      }
    }
    return `ISKCON_DGP_${String(maxNum + 1).padStart(3, '0')}`;
  }

  router.get('/', async (req, res, next) => {
    try {
      const { search = '', month = '', status = 'all', sort = 'upcoming_birthday' } = req.query;
      const refDate = getLocalToday();
      const year = refDate.getFullYear();

      // Cached single round-trip: devotee rows plus wish/parcel/removal state.
      const result = { rows: await getDevoteeRows(db, year) };

      const wishedMap = new Map();
      const removedMap = new Map();
      const parcelMap = new Map();
      for (const row of result.rows) {
        if (row.wish_year !== null && row.wish_year !== undefined) {
          wishedMap.set(String(row.id), {
            channel: row.wish_channel,
            gift_status: row.wish_gift_status,
          });
        }
        if (row.removed_categories && row.removed_categories.length > 0) {
          removedMap.set(Number(row.id), row.removed_categories);
        }
        if (row.parcel_gift_status) {
          parcelMap.set(Number(row.id), row.parcel_gift_status);
        }
      }

      let list = result.rows.map((r) => enrichDevotee(r, wishedMap, refDate, removedMap, parcelMap));

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter(
          (d) =>
            (d.devotee_id && d.devotee_id.toLowerCase().includes(q)) ||
            (d.full_name && d.full_name.toLowerCase().includes(q)) ||
            (d.initiated_name && d.initiated_name.toLowerCase().includes(q)) ||
            (d.contact_no && d.contact_no.toLowerCase().includes(q)) ||
            (d.town_city && d.town_city.toLowerCase().includes(q)) ||
            (d.full_address && d.full_address.toLowerCase().includes(q)) ||
            (d.teacher_name && d.teacher_name.toLowerCase().includes(q))
        );
      }

      if (month && !Number.isNaN(Number(month))) {
        const m = Number(month);
        list = list.filter((d) => d.birth_month === m);
      }

      if (status === 'active' || status === 'inactive') {
        list = list.filter((d) => (d.status || 'active') === status);
      }

      if (sort === 'upcoming_birthday') {
        list.sort((a, b) => (a.days_until_birthday ?? 999) - (b.days_until_birthday ?? 999));
      } else if (sort === 'name') {
        list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
      } else if (sort === 'newest') {
        list.sort((a, b) => String(b.devotee_id).localeCompare(String(a.devotee_id)));
      }

      const total = list.length;
      const limitNum = Number(req.query.limit);
      const offsetNum = Number(req.query.offset);
      const hasLimit = Number.isFinite(limitNum) && limitNum > 0;
      const offset = Number.isFinite(offsetNum) && offsetNum > 0 ? Math.floor(offsetNum) : 0;
      if (hasLimit) {
        list = list.slice(offset, offset + Math.floor(limitNum));
      } else if (offset > 0) {
        list = list.slice(offset);
      }

      res.json({ devotees: list, total });
    } catch (err) {
      next(err);
    }
  });

  router.get('/next-id', async (_req, res, next) => {
    try {
      const next_id = await generateNextId();
      res.json({ next_id });
    } catch (err) {
      next(err);
    }
  });

  router.get('/removals/list', async (_req, res, next) => {
    try {
      const result = await db.query(`
        SELECT
          r.id AS removal_id,
          r.category,
          r.reason,
          r.removed_by_name,
          r.removed_at,
          d.id,
          d.sl_no,
          d.devotee_id,
          d.full_name,
          d.initiated_name,
          d.spouses_name,
          d.contact_no,
          d.town_city,
          d.full_address,
          d.dob,
          d.anniversary_date,
          d.upload_your_passport_size_photo
        FROM devotee_removals r
        JOIN devotee_data d ON d.id = r.devotee_id
        WHERE d.deleted_at IS NULL
        ORDER BY r.removed_at DESC
      `);
      const removals = result.rows.map((row) => ({
        ...row,
        contact_no: row.contact_no ? String(row.contact_no) : '',
        phone: row.contact_no ? String(row.contact_no) : '',
        photo_url: normalizePhotoUrl(row.upload_your_passport_size_photo),
      }));
      res.json({ removals });
    } catch (err) {
      next(err);
    }
  });

  // ── Recycle Bin ────────────────────────────────────────────────────────────
  // Deletes are soft (deleted_at), so a full row plus its wishes, parcels and
  // removal entries survive until an admin permanently deletes it.

  router.get('/recycle-bin', requirePermission('devotees_edit'), async (_req, res, next) => {
    try {
      const result = await db.query(`
        SELECT d.*,
               (SELECT COUNT(*)::int FROM devotee_birthday_wishes w
                 WHERE w.devotee_id = d.id::text) AS wish_count,
               (SELECT COUNT(*)::int FROM parcels p
                 WHERE p.devotee_id = d.id) AS parcel_count,
               (SELECT COUNT(*)::int FROM devotee_removals r
                 WHERE r.devotee_id = d.id) AS removal_count
          FROM devotee_data d
         WHERE d.deleted_at IS NOT NULL
         ORDER BY d.deleted_at DESC
      `);
      const devotees = result.rows.map((row) => ({
        id: row.id,
        sl_no: row.sl_no,
        devotee_id: row.devotee_id || `ISKCON_DGP_${String(row.id).padStart(3, '0')}`,
        full_name: row.full_name,
        initiated_name: row.initiated_name,
        contact_no: row.contact_no ? String(row.contact_no) : '',
        phone: row.contact_no ? String(row.contact_no) : '',
        town_city: row.town_city,
        dob: row.dob,
        gender: row.gender,
        photo_url: normalizePhotoUrl(row.upload_your_passport_size_photo),
        deleted_at: row.deleted_at,
        deleted_by_name: row.deleted_by_name,
        wish_count: row.wish_count,
        parcel_count: row.parcel_count,
        removal_count: row.removal_count,
      }));
      res.json({ devotees, total: devotees.length });
    } catch (err) {
      next(err);
    }
  });

  router.post('/recycle-bin/:id/restore', requirePermission('devotees_edit'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const result = await db.query(
        `UPDATE devotee_data
            SET deleted_at = NULL, deleted_by_name = NULL
          WHERE id = $1 AND deleted_at IS NOT NULL
          RETURNING id, devotee_id, full_name`,
        [targetId]
      );
      const restored = result.rows[0];
      if (!restored) {
        return res.status(404).json({ error: 'Deleted devotee not found' });
      }
      await logAudit(
        db,
        req.user,
        'RESTORE_DEVOTEE',
        'devotee_data',
        targetId,
        `Restored ${restored.full_name} (${restored.devotee_id}) from Recycle Bin`
      );
      res.json({ ok: true, devotee: restored });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/recycle-bin/:id', requirePermission('devotees_edit'), async (req, res, next) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only an admin can permanently delete a record' });
      }
      const targetId = Number(req.params.id);
      const result = await db.query(
        `DELETE FROM devotee_data
          WHERE id = $1 AND deleted_at IS NOT NULL
          RETURNING id, devotee_id, full_name`,
        [targetId]
      );
      const removed = result.rows[0];
      if (!removed) {
        return res.status(404).json({ error: 'Deleted devotee not found' });
      }
      await db.query('DELETE FROM devotee_birthday_wishes WHERE devotee_id = $1', [String(targetId)]);
      await logAudit(
        db,
        req.user,
        'PERMANENT_DELETE_DEVOTEE',
        'devotee_data',
        targetId,
        `Permanently deleted ${removed.full_name} (${removed.devotee_id}) from Recycle Bin`
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/remove-from-tab', requirePermission('devotees_edit', 'removals'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const category = String(req.body?.category || '').trim().toLowerCase();
      const reason = req.body?.reason ? String(req.body.reason).trim() : null;

      if (!['birthday', 'anniversary', 'parcel'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category (must be birthday, anniversary, or parcel)' });
      }

      const devRes = await db.query(
        'SELECT id, full_name, devotee_id FROM devotee_data WHERE id = $1 AND deleted_at IS NULL',
        [targetId]
      );
      if (devRes.rows.length === 0) {
        return res.status(404).json({ error: 'Devotee not found' });
      }

      await db.query(
        `INSERT INTO devotee_removals (devotee_id, category, reason, removed_by, removed_by_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (devotee_id, category) DO UPDATE SET
           reason = COALESCE(EXCLUDED.reason, devotee_removals.reason),
           removed_by = EXCLUDED.removed_by,
           removed_by_name = EXCLUDED.removed_by_name,
           removed_at = NOW()`,
        [targetId, category, reason, req.user.id, req.user.name || req.user.username]
      );

      await logAudit(
        db,
        req.user,
        'REMOVE_FROM_TAB',
        'DEVOTEE',
        targetId,
        `Moved ${devRes.rows[0].full_name} (${devRes.rows[0].devotee_id}) from ${category} to Removal Record`
      );

      res.json({ ok: true, devotee_id: targetId, category });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id/remove-from-tab/:category', requirePermission('devotees_edit', 'removals'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const category = String(req.params.category || '').trim().toLowerCase();

      if (!['birthday', 'anniversary', 'parcel'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const devCheck = await db.query(
        'SELECT id FROM devotee_data WHERE id = $1 AND deleted_at IS NULL',
        [targetId]
      );
      if (devCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Devotee not found' });
      }

      await db.query(
        'DELETE FROM devotee_removals WHERE devotee_id = $1 AND category = $2',
        [targetId, category]
      );

      await logAudit(
        db,
        req.user,
        'RESTORE_TO_TAB',
        'DEVOTEE',
        targetId,
        `Restored devotee #${targetId} back to ${category}`
      );

      res.json({ ok: true, devotee_id: targetId, category });
    } catch (err) {
      next(err);
    }
  });

  router.get('/export/csv', async (_req, res, next) => {
    try {
      const refDate = getLocalToday();
      const rows = await getDevoteeRows(db, refDate.getFullYear());
      const wishedSet = new Map(
        rows
          .filter((r) => r.wish_year !== null && r.wish_year !== undefined)
          .map((r) => [String(r.id), { channel: r.wish_channel, gift_status: r.wish_gift_status }])
      );
      const list = rows.map((r) => enrichDevotee(r, wishedSet, refDate));

      const headers = [
        'Devotee ID',
        'Full Name',
        'Fathers Name',
        'Spouses Name',
        'Initiated Name',
        'Contact No',
        'WhatsApp No',
        'DOB',
        'Age',
        'Days Until Birthday',
        'Gender',
        'Blood Group',
        'Town / City',
        'Full Address',
        'Teacher Name',
        'Spiritual Master',
        'First Initiation Date',
        'Second Initiation Date',
        'Anniversary Date',
        'Wished This Year',
      ];

      const escapeCsv = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvLines = [
        headers.join(','),
        ...list.map((d) =>
          [
            d.devotee_id,
            d.full_name,
            d.fathers_name,
            d.spouses_name,
            d.initiated_name,
            d.contact_no,
            d.whatsapp_no,
            d.dob,
            d.age,
            d.days_until_birthday,
            d.gender,
            d.blood_group,
            d.town_city,
            d.full_address,
            d.teacher_name,
            d.spiritual_master,
            d.first_initiation_date,
            d.second_initiation_date,
            d.anniversary_date,
            d.wished_this_year ? 'Yes' : 'No',
          ]
            .map(escapeCsv)
            .join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="devotees_iskcon_durgapur.csv"');
      res.send('\uFEFF' + csvLines.join('\r\n'));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const result = await db.query(
        'SELECT * FROM devotee_data WHERE id = $1 AND deleted_at IS NULL',
        [Number(req.params.id)]
      );
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: 'Devotee not found' });
      const refDate = getLocalToday();
      const wishedSet = await getWishedSet(refDate.getFullYear());
      res.json({ devotee: enrichDevotee(row, wishedSet, refDate) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requirePermission('devotees_edit'), async (req, res, next) => {
    try {
      const {
        devotee_id,
        full_name,
        fathers_name,
        spouses_name,
        dob,
        gender,
        contact_no,
        phone,
        whatsapp_no,
        blood_group,
        town_city,
        city,
        full_address,
        address,
        teacher_name,
        spiritual_master,
        initiated_name,
        spiritual_name,
        first_initiation_date,
        second_initiation_date,
        anniversary_date,
        upload_your_passport_size_photo,
        photo_url,
      } = req.body || {};

      const contactBigint = parsePhoneBigint(contact_no || phone);
      if (!full_name || !contactBigint || !dob) {
        return res.status(400).json({ error: 'Full name, contact number, and date of birth are required' });
      }
      if (!parseDob(dob)) {
        return res.status(400).json({ error: 'Please provide a valid date of birth' });
      }

      const finalDevoteeId = devotee_id
        ? String(devotee_id).trim().toUpperCase()
        : await generateNextId();

      const dup = await db.query('SELECT devotee_id FROM devotee_data WHERE devotee_id = $1', [
        finalDevoteeId,
      ]);
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: `Devotee ID "${finalDevoteeId}" already exists` });
      }

      const slRes = await db.query('SELECT COALESCE(MAX(sl_no), 0)::int + 1 AS next_sl FROM devotee_data');
      const nextSlNo = slRes.rows[0]?.next_sl || 1;

      const inserted = await db.query(
        `INSERT INTO devotee_data (
          sl_no, devotee_id, full_name, fathers_name, spouses_name, dob, gender,
          contact_no, whatsapp_no, blood_group, town_city, full_address,
          teacher_name, spiritual_master, initiated_name,
          first_initiation_date, second_initiation_date, anniversary_date,
          upload_your_passport_size_photo
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19
        )
        RETURNING *`,
        [
          nextSlNo,
          finalDevoteeId,
          String(full_name).trim(),
          fathers_name ? String(fathers_name).trim() : null,
          spouses_name ? String(spouses_name).trim() : null,
          String(dob).trim(),
          gender || 'Male',
          contactBigint,
          parsePhoneBigint(whatsapp_no),
          blood_group ? String(blood_group).trim() : null,
          (town_city || city) ? String(town_city || city).trim() : null,
          (full_address || address) ? String(full_address || address).trim() : null,
          teacher_name ? String(teacher_name).trim() : null,
          spiritual_master ? String(spiritual_master).trim() : null,
          (initiated_name || spiritual_name) ? String(initiated_name || spiritual_name).trim() : null,
          first_initiation_date ? String(first_initiation_date).trim() : null,
          second_initiation_date ? String(second_initiation_date).trim() : null,
          anniversary_date ? String(anniversary_date).trim() : null,
          upload_your_passport_size_photo || photo_url || null,
        ]
      );

      const created = inserted.rows[0];
      const refDate = getLocalToday();
      const wishedSet = await getWishedSet(refDate.getFullYear());

      await logAudit(db, req.user, 'CREATE_DEVOTEE', 'DEVOTEE', null, `Registered ${created.full_name} (${created.devotee_id})`);
      res.status(201).json({ devotee: enrichDevotee(created, wishedSet, refDate) });
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', requirePermission('devotees_edit'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const existingRes = await db.query(
        'SELECT * FROM devotee_data WHERE id = $1 AND deleted_at IS NULL',
        [targetId]
      );
      const existing = existingRes.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'Devotee not found' });
      }

      const {
        devotee_id,
        full_name,
        fathers_name,
        spouses_name,
        dob,
        gender,
        contact_no,
        phone,
        whatsapp_no,
        blood_group,
        town_city,
        city,
        full_address,
        address,
        teacher_name,
        spiritual_master,
        initiated_name,
        spiritual_name,
        first_initiation_date,
        second_initiation_date,
        anniversary_date,
        upload_your_passport_size_photo,
        photo_url,
      } = req.body || {};

      if (dob !== undefined && !parseDob(dob)) {
        return res.status(400).json({ error: 'Please provide a valid date of birth' });
      }

      const nextDevoteeId =
        devotee_id !== undefined && String(devotee_id).trim()
          ? String(devotee_id).trim().toUpperCase()
          : existing.devotee_id;

      if (nextDevoteeId !== existing.devotee_id) {
        const dup = await db.query('SELECT devotee_id FROM devotee_data WHERE devotee_id = $1', [
          nextDevoteeId,
        ]);
        if (dup.rows.length > 0) {
          return res.status(409).json({ error: `Devotee ID "${nextDevoteeId}" already exists` });
        }
      }

      const nextFullName = full_name !== undefined ? String(full_name).trim() : existing.full_name;
      const rawContact = contact_no !== undefined ? contact_no : phone;
      const nextContact = rawContact !== undefined ? parsePhoneBigint(rawContact) : existing.contact_no;
      if (!nextFullName || !nextContact) {
        return res.status(400).json({ error: 'Full name and contact number cannot be empty' });
      }

      const rawCity = town_city !== undefined ? town_city : city;
      const rawAddr = full_address !== undefined ? full_address : address;
      const rawInit = initiated_name !== undefined ? initiated_name : spiritual_name;
      const rawPhoto = upload_your_passport_size_photo !== undefined ? upload_your_passport_size_photo : photo_url;

      const updatedRes = await db.query(
        `UPDATE devotee_data SET
          devotee_id = $1,
          full_name = $2,
          fathers_name = $3,
          spouses_name = $4,
          dob = $5,
          gender = $6,
          contact_no = $7,
          whatsapp_no = $8,
          blood_group = $9,
          town_city = $10,
          full_address = $11,
          teacher_name = $12,
          spiritual_master = $13,
          initiated_name = $14,
          first_initiation_date = $15,
          second_initiation_date = $16,
          anniversary_date = $17,
          upload_your_passport_size_photo = $18
        WHERE id = $19
        RETURNING *`,
        [
          nextDevoteeId,
          nextFullName,
          fathers_name !== undefined ? (fathers_name ? String(fathers_name).trim() : null) : existing.fathers_name,
          spouses_name !== undefined ? (spouses_name ? String(spouses_name).trim() : null) : existing.spouses_name,
          dob !== undefined ? String(dob).trim() : existing.dob,
          gender !== undefined ? gender : existing.gender,
          nextContact,
          whatsapp_no !== undefined ? parsePhoneBigint(whatsapp_no) : existing.whatsapp_no,
          blood_group !== undefined ? (blood_group ? String(blood_group).trim() : null) : existing.blood_group,
          rawCity !== undefined ? (rawCity ? String(rawCity).trim() : null) : existing.town_city,
          rawAddr !== undefined ? (rawAddr ? String(rawAddr).trim() : null) : existing.full_address,
          teacher_name !== undefined ? (teacher_name ? String(teacher_name).trim() : null) : existing.teacher_name,
          spiritual_master !== undefined ? (spiritual_master ? String(spiritual_master).trim() : null) : existing.spiritual_master,
          rawInit !== undefined ? (rawInit ? String(rawInit).trim() : null) : existing.initiated_name,
          first_initiation_date !== undefined ? (first_initiation_date ? String(first_initiation_date).trim() : null) : existing.first_initiation_date,
          second_initiation_date !== undefined ? (second_initiation_date ? String(second_initiation_date).trim() : null) : existing.second_initiation_date,
          anniversary_date !== undefined ? (anniversary_date ? String(anniversary_date).trim() : null) : existing.anniversary_date,
          rawPhoto !== undefined ? (rawPhoto || null) : existing.upload_your_passport_size_photo,
          targetId,
        ]
      );

      const updated = updatedRes.rows[0];
      const refDate = getLocalToday();
      const wishedSet = await getWishedSet(refDate.getFullYear());

      await logAudit(db, req.user, 'UPDATE_DEVOTEE', 'DEVOTEE', null, `Updated ${updated.full_name} (${updated.devotee_id})`);
      res.json({ devotee: enrichDevotee(updated, wishedSet, refDate) });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', requirePermission('devotees_edit'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const result = await db.query(
        `UPDATE devotee_data
            SET deleted_at = NOW(), deleted_by_name = $2
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING id, devotee_id, full_name`,
        [targetId, req.user.name || req.user.username || 'Unknown']
      );
      const existing = result.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'Devotee not found' });
      }

      // Keep wishes, parcels and removal entries so a restore is lossless.
      await logAudit(
        db,
        req.user,
        'MOVE_TO_RECYCLE_BIN',
        'devotee_data',
        targetId,
        `Moved ${existing.full_name} (${existing.devotee_id}) to Recycle Bin`
      );
      res.json({ ok: true, recycled: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/wish', requirePermission('devotees_edit', 'birthdays'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const existingRes = await db.query(
        'SELECT id, devotee_id, full_name FROM devotee_data WHERE id = $1 AND deleted_at IS NULL',
        [targetId]
      );
      const existing = existingRes.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'Devotee not found' });
      }

      const year = getLocalToday().getFullYear();
      const { wished = true, channel = 'Call/Message', note = '' } = req.body || {};

      if (wished) {
        await db.query(
          `INSERT INTO devotee_birthday_wishes (devotee_id, wish_year, wished_by, channel, note)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (devotee_id, wish_year) DO UPDATE SET
             wished_by = EXCLUDED.wished_by,
             channel = EXCLUDED.channel,
             note = EXCLUDED.note,
             wished_at = NOW()`,
          [String(targetId), year, req.user.id, String(channel), String(note)]
        );
        await logAudit(db, req.user, 'BIRTHDAY_WISH', 'devotee_data', targetId, `Marked birthday wish for ${existing.full_name}`);
      } else {
        await db.query('DELETE FROM devotee_birthday_wishes WHERE devotee_id = $1 AND wish_year = $2', [String(targetId), year]);
        await logAudit(db, req.user, 'BIRTHDAY_UNWISH', 'devotee_data', targetId, `Removed birthday wish for ${existing.full_name}`);
      }

      res.json({ ok: true, wished: Boolean(wished) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/gift', requirePermission('parcels', 'devotees_edit'), async (req, res, next) => {
    try {
      const targetId = Number(req.params.id);
      const existingRes = await db.query(
        'SELECT id, devotee_id, full_name, contact_no, town_city, full_address FROM devotee_data WHERE id = $1 AND deleted_at IS NULL',
        [targetId]
      );
      const existing = existingRes.rows[0];
      if (!existing) {
        return res.status(404).json({ error: 'Devotee not found' });
      }

      const year = getLocalToday().getFullYear();
      const { gift_status = 'none' } = req.body || {};
      const validStatus = ['none', 'packed', 'in_transit', 'delivered'].includes(gift_status)
        ? gift_status
        : 'none';

      await db.query(
        `INSERT INTO parcels (
          devotee_id, devotee_code, full_name, contact_no, town_city, full_address,
          parcel_year, gift_status, updated_by, updated_by_name, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (devotee_id, parcel_year) DO UPDATE SET
          devotee_code = EXCLUDED.devotee_code,
          full_name = EXCLUDED.full_name,
          contact_no = EXCLUDED.contact_no,
          town_city = EXCLUDED.town_city,
          full_address = EXCLUDED.full_address,
          gift_status = EXCLUDED.gift_status,
          updated_by = EXCLUDED.updated_by,
          updated_by_name = EXCLUDED.updated_by_name,
          updated_at = NOW()`,
        [
          targetId,
          existing.devotee_id || '',
          existing.full_name || '',
          existing.contact_no ? String(existing.contact_no) : '',
          existing.town_city || '',
          existing.full_address || '',
          year,
          validStatus,
          req.user.id,
          req.user.name || req.user.username,
        ]
      );

      await logAudit(db, req.user, 'PARCEL_STATUS', 'parcels', targetId, `Parcel status "${validStatus}" for ${existing.full_name}`);
      res.json({ ok: true, gift_status: validStatus });
    } catch (err) {
      next(err);
    }
  });

  router.get('/applications/list', requirePermission('applications', 'devotees_edit'), async (req, res, next) => {
    try {
      const result = await db.query(
        'SELECT * FROM devotee_applications ORDER BY created_at DESC'
      );
      const applications = result.rows.map((row) => ({
        ...row,
        contact_no: row.contact_no ? String(row.contact_no) : '',
        phone: row.contact_no ? String(row.contact_no) : '',
        whatsapp_no: row.whatsapp_no ? String(row.whatsapp_no) : '',
        photo_url: normalizePhotoUrl(row.upload_your_passport_size_photo),
      }));
      res.json({ applications });
    } catch (err) {
      next(err);
    }
  });

  router.post('/applications', requirePermission('devotees_edit', 'applications'), async (req, res, next) => {
    try {
      const {
        devotee_id,
        full_name,
        fathers_name,
        spouses_name,
        dob,
        gender,
        contact_no,
        phone,
        whatsapp_no,
        blood_group,
        town_city,
        city,
        full_address,
        address,
        teacher_name,
        spiritual_master,
        initiated_name,
        spiritual_name,
        first_initiation_date,
        second_initiation_date,
        anniversary_date,
        upload_your_passport_size_photo,
        photo_url,
      } = req.body || {};

      const contactBigint = parsePhoneBigint(contact_no || phone);
      if (!full_name || !contactBigint || !dob) {
        return res.status(400).json({ error: 'Full name, contact number, and date of birth are required' });
      }
      if (!parseDob(dob)) {
        return res.status(400).json({ error: 'Please provide a valid date of birth' });
      }

      const inserted = await db.query(
        `INSERT INTO devotee_applications (
          devotee_id, full_name, fathers_name, spouses_name, dob, gender,
          contact_no, whatsapp_no, blood_group, town_city, full_address,
          teacher_name, spiritual_master, initiated_name,
          first_initiation_date, second_initiation_date, anniversary_date,
          upload_your_passport_size_photo, status, submitted_by, submitted_by_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17,
          $18, 'pending', $19, $20
        )
        RETURNING *`,
        [
          devotee_id ? String(devotee_id).trim().toUpperCase() : null,
          String(full_name).trim(),
          fathers_name ? String(fathers_name).trim() : null,
          spouses_name ? String(spouses_name).trim() : null,
          String(dob).trim(),
          gender || 'Male',
          contactBigint,
          parsePhoneBigint(whatsapp_no),
          blood_group ? String(blood_group).trim() : null,
          (town_city || city) ? String(town_city || city).trim() : null,
          (full_address || address) ? String(full_address || address).trim() : null,
          teacher_name ? String(teacher_name).trim() : null,
          spiritual_master ? String(spiritual_master).trim() : null,
          (initiated_name || spiritual_name) ? String(initiated_name || spiritual_name).trim() : null,
          first_initiation_date ? String(first_initiation_date).trim() : null,
          second_initiation_date ? String(second_initiation_date).trim() : null,
          anniversary_date ? String(anniversary_date).trim() : null,
          upload_your_passport_size_photo || photo_url || null,
          req.user.id,
          req.user.name || req.user.username,
        ]
      );

      await logAudit(
        db,
        req.user,
        'SUBMIT_APPLICATION',
        'devotee_applications',
        inserted.rows[0].id,
        `Submitted registration application for ${inserted.rows[0].full_name}`
      );
      res.status(201).json({ application: inserted.rows[0] });
    } catch (err) {
      next(err);
    }
  });

  router.post('/applications/:id/approve', requirePermission('applications'), async (req, res, next) => {
    try {
      const appId = Number(req.params.id);
      const appRes = await db.query(
        'SELECT * FROM devotee_applications WHERE id = $1',
        [appId]
      );
      const appRow = appRes.rows[0];
      if (!appRow) {
        return res.status(404).json({ error: 'Application not found' });
      }
      if (appRow.status === 'approved') {
        return res.status(400).json({ error: 'Application is already approved' });
      }

      let finalDevoteeId = appRow.devotee_id
        ? String(appRow.devotee_id).trim().toUpperCase()
        : await generateNextId();

      const dup = await db.query(
        'SELECT devotee_id FROM devotee_data WHERE devotee_id = $1',
        [finalDevoteeId]
      );
      if (dup.rows.length > 0) {
        finalDevoteeId = await generateNextId();
      }

      const slRes = await db.query(
        'SELECT COALESCE(MAX(sl_no), 0)::int + 1 AS next_sl FROM devotee_data'
      );
      const nextSlNo = slRes.rows[0]?.next_sl || 1;

      const inserted = await db.query(
        `INSERT INTO devotee_data (
          sl_no, devotee_id, full_name, fathers_name, spouses_name, dob, gender,
          contact_no, whatsapp_no, blood_group, town_city, full_address,
          teacher_name, spiritual_master, initiated_name,
          first_initiation_date, second_initiation_date, anniversary_date,
          upload_your_passport_size_photo
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13, $14, $15,
          $16, $17, $18,
          $19
        )
        RETURNING *`,
        [
          nextSlNo,
          finalDevoteeId,
          appRow.full_name,
          appRow.fathers_name,
          appRow.spouses_name,
          appRow.dob,
          appRow.gender,
          appRow.contact_no,
          appRow.whatsapp_no,
          appRow.blood_group,
          appRow.town_city,
          appRow.full_address,
          appRow.teacher_name,
          appRow.spiritual_master,
          appRow.initiated_name,
          appRow.first_initiation_date,
          appRow.second_initiation_date,
          appRow.anniversary_date,
          appRow.upload_your_passport_size_photo,
        ]
      );

      await db.query(
        `UPDATE devotee_applications
         SET status = 'approved', reviewed_by = $1, reviewed_by_name = $2, reviewed_at = NOW(), devotee_id = $3
         WHERE id = $4`,
        [req.user.id, req.user.name || req.user.username, finalDevoteeId, appId]
      );

      await logAudit(
        db,
        req.user,
        'APPROVE_APPLICATION',
        'devotee_data',
        inserted.rows[0].id,
        `Approved application #${appId} for ${appRow.full_name} (${finalDevoteeId})`
      );

      res.json({ ok: true, devotee: inserted.rows[0] });
    } catch (err) {
      next(err);
    }
  });

  router.post('/applications/:id/reject', requirePermission('applications'), async (req, res, next) => {
    try {
      const appId = Number(req.params.id);
      const appRes = await db.query(
        'SELECT id, full_name, status FROM devotee_applications WHERE id = $1',
        [appId]
      );
      if (appRes.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      await db.query(
        `UPDATE devotee_applications
         SET status = 'rejected', reviewed_by = $1, reviewed_by_name = $2, reviewed_at = NOW()
         WHERE id = $3`,
        [req.user.id, req.user.name || req.user.username, appId]
      );

      await logAudit(
        db,
        req.user,
        'REJECT_APPLICATION',
        'devotee_applications',
        appId,
        `Rejected application #${appId} for ${appRes.rows[0].full_name}`
      );

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/bulk-update', requirePermission('bulk_fix'), async (req, res, next) => {
    try {
      const ALLOWED_FIELDS = new Set([
        'spiritual_master',
        'teacher_name',
        'initiated_name',
        'town_city',
        'blood_group',
        'gender',
      ]);

      const { field, toValue, devoteeIds } = req.body || {};
      if (!ALLOWED_FIELDS.has(field)) {
        return res.status(400).json({ error: 'Invalid field for bulk update' });
      }

      const cleanTo = toValue !== undefined && toValue !== null ? String(toValue).trim() : '';
      if (!Array.isArray(devoteeIds) || devoteeIds.length === 0) {
        return res.status(400).json({ error: 'Please select at least one devotee record' });
      }

      const ids = devoteeIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length === 0) {
        return res.status(400).json({ error: 'No valid devotee IDs provided' });
      }

      const upd = await db.query(
        `UPDATE devotee_data SET ${field} = $1 WHERE id = ANY($2::int[]) AND deleted_at IS NULL`,
        [cleanTo || null, ids]
      );

      await logAudit(
        db,
        req.user,
        'BULK_UPDATE',
        'devotee_data',
        null,
        `Bulk updated ${field} to "${cleanTo}" for ${upd.rowCount} devotees`
      );

      res.json({ ok: true, updatedCount: upd.rowCount });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createDevoteeRoutes;
