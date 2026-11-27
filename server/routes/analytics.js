const express = require('express');
const { getDevoteeRows } = require('../devoteeCache');
const { computeBirthdayInfo, getLocalToday } = require('../utils/birthday');

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function createAnalyticsRoutes(db, { requireAuth, requirePermission }) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/birthdays', async (_req, res, next) => {
    try {
      const refDate = getLocalToday();
      const currentYear = refDate.getFullYear();
      const currentMonth = refDate.getMonth() + 1;

      const rows = await getDevoteeRows(db, currentYear);

      const enriched = rows.map((r) => {
        const {
          wish_year,
          wish_wished_at,
          wish_channel,
          wish_gift_status,
          parcel_gift_status,
          removed_categories,
          ...row
        } = r;
        const bday = computeBirthdayInfo(row.dob, refDate);
        const wished = wish_year !== null && wish_year !== undefined;
        return {
          ...row,
          id: row.id,
          devotee_id: row.devotee_id || `ISKCON_DGP_${String(row.id).padStart(3, '0')}`,
          phone: row.contact_no ? String(row.contact_no) : '',
          city: row.town_city || '',
          spiritual_name: row.initiated_name || '',
          ...bday,
          wished_this_year: wished,
          wished_at: wished ? wish_wished_at : null,
        };
      });

      const todayBirthdays = enriched
        .filter((d) => d.is_birthday_today)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

      const upcoming7Days = enriched
        .filter((d) => d.days_until_birthday !== null && d.days_until_birthday > 0 && d.days_until_birthday <= 7)
        .sort((a, b) => a.days_until_birthday - b.days_until_birthday);

      const upcoming30Days = enriched
        .filter((d) => d.days_until_birthday !== null && d.days_until_birthday >= 0 && d.days_until_birthday <= 30)
        .sort((a, b) => a.days_until_birthday - b.days_until_birthday);

      const thisMonthBirthdays = enriched
        .filter((d) => d.birth_month === currentMonth)
        .sort((a, b) => (a.birth_day ?? 0) - (b.birth_day ?? 0));

      const monthlyCounts = Array.from({ length: 12 }, (_, idx) => ({
        month: idx + 1,
        name: MONTH_NAMES[idx],
        shortName: MONTH_NAMES[idx].slice(0, 3),
        count: 0,
      }));
      for (const d of enriched) {
        if (d.birth_month >= 1 && d.birth_month <= 12) {
          monthlyCounts[d.birth_month - 1].count += 1;
        }
      }

      const ageGroups = [
        { label: 'Under 18', count: 0 },
        { label: '18–25', count: 0 },
        { label: '26–35', count: 0 },
        { label: '36–50', count: 0 },
        { label: '51+', count: 0 },
      ];
      for (const d of enriched) {
        if (d.age === null) continue;
        if (d.age < 18) ageGroups[0].count += 1;
        else if (d.age <= 25) ageGroups[1].count += 1;
        else if (d.age <= 35) ageGroups[2].count += 1;
        else if (d.age <= 50) ageGroups[3].count += 1;
        else ageGroups[4].count += 1;
      }

      const genderMap = {};
      for (const d of enriched) {
        const g = d.gender || 'Other';
        genderMap[g] = (genderMap[g] || 0) + 1;
      }
      const genderBreakdown = Object.entries(genderMap).map(([label, count]) => ({ label, count }));

      const cityMap = {};
      for (const d of enriched) {
        const c = (d.town_city || 'Unassigned').trim() || 'Unassigned';
        cityMap[c] = (cityMap[c] || 0) + 1;
      }
      const centerBreakdown = Object.entries(cityMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const logsRes = await db.query(
        'SELECT id, user_name, action, entity_type, details, created_at FROM audit_logs ORDER BY id DESC LIMIT 12'
      );

      res.json({
        summary: {
          totalDevotees: rows.length,
          activeDevotees: rows.length,
          inactiveDevotees: 0,
          todayCount: todayBirthdays.length,
          upcoming7Count: upcoming7Days.length,
          upcoming30Count: upcoming30Days.length,
          thisMonthCount: thisMonthBirthdays.length,
          wishedThisYearCount: rows.filter((r) => r.wish_year !== null && r.wish_year !== undefined).length,
        },
        todayBirthdays,
        upcoming7Days,
        upcoming30Days,
        thisMonthBirthdays,
        monthlyCounts,
        ageGroups,
        genderBreakdown,
        centerBreakdown,
        recentLogs: logsRes.rows,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/insights', requirePermission('insights'), async (_req, res, next) => {
    try {
      const refDate = getLocalToday();
      const currentYear = refDate.getFullYear();

      const rows = await getDevoteeRows(db, currentYear);
      const total = rows.length;
      const statsRes = await db
        .query(
          `SELECT
             (SELECT COALESCE(json_agg(json_build_object('channel', w.channel)), '[]'::json)
                FROM devotee_birthday_wishes w
                JOIN devotee_data d ON d.id::text = w.devotee_id AND d.deleted_at IS NULL
               WHERE w.wish_year = $1) AS wishes,
             (SELECT COALESCE(json_agg(json_build_object('gift_status', p.gift_status)), '[]'::json)
                FROM parcels p
                JOIN devotee_data d ON d.id = p.devotee_id AND d.deleted_at IS NULL
               WHERE p.parcel_year = $1) AS parcels,
             (SELECT COALESCE(json_agg(json_build_object('category', r.category)), '[]'::json)
                FROM devotee_removals r
                JOIN devotee_data d ON d.id = r.devotee_id AND d.deleted_at IS NULL) AS removals`,
          [currentYear]
        )
        .catch(() => ({ rows: [{ wishes: [], parcels: [], removals: [] }] }));
      const stats = statsRes.rows[0] || { wishes: [], parcels: [], removals: [] };

      const isFilled = (v) => {
        if (v === null || v === undefined) return false;
        const s = String(v).trim();
        return s !== '' && !['null', 'none', 'na', 'n/a', '-'].includes(s.toLowerCase());
      };

      const columnDefs = [
        { key: 'sl_no', label: 'SL NO' },
        { key: 'devotee_id', label: 'Devotee ID' },
        { key: 'full_name', label: 'Full Name' },
        { key: 'fathers_name', label: "Father's Name" },
        { key: 'spouses_name', label: "Spouse's Name" },
        { key: 'dob', label: 'Date of Birth' },
        { key: 'gender', label: 'Gender' },
        { key: 'contact_no', label: 'Contact No' },
        { key: 'whatsapp_no', label: 'WhatsApp No' },
        { key: 'blood_group', label: 'Blood Group' },
        { key: 'town_city', label: 'Town / City' },
        { key: 'full_address', label: 'Full Address' },
        { key: 'teacher_name', label: 'Teacher / Counselor' },
        { key: 'spiritual_master', label: 'Spiritual Master' },
        { key: 'initiated_name', label: 'Initiated Name' },
        { key: 'first_initiation_date', label: '1st Initiation Date' },
        { key: 'second_initiation_date', label: '2nd Initiation Date' },
        { key: 'anniversary_date', label: 'Anniversary Date' },
        { key: 'upload_your_passport_size_photo', label: 'Passport Photo' },
      ];

      const completeness = columnDefs.map((col) => {
        const filled = rows.reduce(
          (acc, r) => (isFilled(r[col.key]) ? acc + 1 : acc),
          0
        );
        return {
          key: col.key,
          label: col.label,
          filled,
          missing: total - filled,
          pct: total > 0 ? Math.round((filled / total) * 100) : 0,
        };
      });

      const groupBy = (getter) => {
        const map = new Map();
        for (const r of rows) {
          const raw = getter(r);
          const label = isFilled(raw) ? String(raw).trim() : 'Not Specified';
          map.set(label, (map.get(label) || 0) + 1);
        }
        return Array.from(map.entries())
          .map(([label, count]) => ({
            label,
            count,
            pct: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);
      };

      const gender = groupBy((r) => r.gender);
      const bloodGroup = groupBy((r) =>
        isFilled(r.blood_group) ? String(r.blood_group).trim().toUpperCase() : ''
      );
      const townCity = groupBy((r) => r.town_city);
      const teacherName = groupBy((r) => r.teacher_name);
      const spiritualMaster = groupBy((r) => r.spiritual_master);

      const ageBuckets = {
        'Under 18': 0,
        '18 – 25': 0,
        '26 – 40': 0,
        '41 – 60': 0,
        '60+': 0,
        Unknown: 0,
      };
      const birthMonths = MONTH_NAMES.map((name, idx) => ({
        month: idx + 1,
        name,
        shortName: name.slice(0, 3),
        count: 0,
      }));
      const anniversaryMonths = MONTH_NAMES.map((name, idx) => ({
        month: idx + 1,
        name,
        shortName: name.slice(0, 3),
        count: 0,
      }));

      let initiatedNameCount = 0;
      let firstInitiationCount = 0;
      let secondInitiationCount = 0;
      let anniversaryCount = 0;

      for (const r of rows) {
        if (isFilled(r.initiated_name)) initiatedNameCount += 1;
        if (isFilled(r.first_initiation_date)) firstInitiationCount += 1;
        if (isFilled(r.second_initiation_date)) secondInitiationCount += 1;
        if (isFilled(r.anniversary_date)) anniversaryCount += 1;

        const b = computeBirthdayInfo(r.dob, refDate);
        if (b.birth_month) birthMonths[b.birth_month - 1].count += 1;
        if (b.age === null || b.age < 0) ageBuckets.Unknown += 1;
        else if (b.age < 18) ageBuckets['Under 18'] += 1;
        else if (b.age <= 25) ageBuckets['18 – 25'] += 1;
        else if (b.age <= 40) ageBuckets['26 – 40'] += 1;
        else if (b.age <= 60) ageBuckets['41 – 60'] += 1;
        else ageBuckets['60+'] += 1;

        const a = computeBirthdayInfo(r.anniversary_date, refDate);
        if (a.birth_month) anniversaryMonths[a.birth_month - 1].count += 1;
      }

      const ageGroups = Object.entries(ageBuckets).map(([label, count]) => ({
        label,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

      let wishedThisYear = 0;
      let packed = 0;
      let inTransit = 0;
      let delivered = 0;
      for (const w of stats.wishes || []) {
        if (w.channel !== 'GiftOnly') wishedThisYear += 1;
      }
      for (const p of stats.parcels || []) {
        if (p.gift_status === 'packed') packed += 1;
        else if (p.gift_status === 'in_transit') inTransit += 1;
        else if (p.gift_status === 'delivered') delivered += 1;
      }

      const removals = {
        birthday: 0,
        anniversary: 0,
        parcel: 0,
        total: (stats.removals || []).length,
      };
      for (const rem of stats.removals || []) {
        if (rem.category === 'birthday') removals.birthday += 1;
        else if (rem.category === 'anniversary') removals.anniversary += 1;
        else if (rem.category === 'parcel') removals.parcel += 1;
      }

      const avgCompleteness =
        completeness.length > 0
          ? Math.round(
              completeness.reduce((acc, c) => acc + c.pct, 0) / completeness.length
            )
          : 0;

      res.json({
        totalDevotees: total,
        avgCompleteness,
        completeness,
        initiation: {
          initiatedNameCount,
          uninitiatedCount: total - initiatedNameCount,
          firstInitiationCount,
          secondInitiationCount,
          anniversaryCount,
        },
        breakdowns: {
          gender,
          bloodGroup,
          townCity,
          teacherName,
          spiritualMaster,
          ageGroups,
          birthMonths,
          anniversaryMonths,
        },
        giftsAndWishes: {
          wishedThisYear,
          packed,
          inTransit,
          delivered,
          none: Math.max(0, total - packed - inTransit - delivered),
        },
        removals,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/activity-logs', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const logsRes = await db.query(
        'SELECT id, user_name, action, entity_type, details, created_at FROM audit_logs ORDER BY id DESC LIMIT $1',
        [limit]
      );
      res.json({ logs: logsRes.rows });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createAnalyticsRoutes;
