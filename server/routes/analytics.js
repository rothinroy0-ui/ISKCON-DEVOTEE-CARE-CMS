const express = require('express');
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

function createAnalyticsRoutes(db, { requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/birthdays', async (_req, res, next) => {
    try {
      const refDate = getLocalToday();
      const currentYear = refDate.getFullYear();
      const currentMonth = refDate.getMonth() + 1;

      const wishedRes = await db.query(
        'SELECT devotee_id, wished_at, channel FROM devotee_birthday_wishes WHERE wish_year = $1',
        [currentYear]
      );
      const wishedRows = wishedRes.rows;
      const wishedMap = new Map(wishedRows.map((r) => [r.devotee_id, r]));

      const devoteeRes = await db.query('SELECT * FROM devotee_data');
      const rows = devoteeRes.rows;

      const enriched = rows.map((r) => {
        const bday = computeBirthdayInfo(r.dob, refDate);
        const wish = wishedMap.get(String(r.id));
        return {
          ...r,
          id: r.id,
          devotee_id: r.devotee_id || `ISKCON_DGP_${String(r.id).padStart(3, '0')}`,
          phone: r.contact_no ? String(r.contact_no) : '',
          city: r.town_city || '',
          spiritual_name: r.initiated_name || '',
          ...bday,
          wished_this_year: Boolean(wish),
          wished_at: wish ? wish.wished_at : null,
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
          wishedThisYearCount: wishedRows.length,
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

  return router;
}

module.exports = createAnalyticsRoutes;
