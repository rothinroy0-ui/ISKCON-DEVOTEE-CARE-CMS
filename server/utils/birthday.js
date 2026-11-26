const MONTH_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function getLocalToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDob(dobStr) {
  if (!dobStr) return null;
  const s = String(dobStr).trim();

  // 1. YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const [, y, mo, d] = m.map(Number);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return { year: y, month: mo, day: d };
  }

  // 2. "24 July, 1969" or "24 July 1969"
  m = s.match(/^(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = MONTH_MAP[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (month && day >= 1 && day <= 31) return { year, month, day };
  }

  // 3. "24-Sep-2023" or "24-09-1990" or "24/09/1990"
  m = s.match(/^(\d{1,2})[-/](\d{1,2}|[A-Za-z]+)[-/](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = /^\d+$/.test(m[2]) ? Number(m[2]) : MONTH_MAP[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (month && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  // 4. Fallback JS Date
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    return { year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate() };
  }

  return null;
}

function computeBirthdayInfo(dobStr, referenceDate = getLocalToday()) {
  const parsed = parseDob(dobStr);
  if (!parsed) {
    return {
      birth_year: null,
      birth_month: null,
      birth_day: null,
      age: null,
      turning_age: null,
      days_until_birthday: null,
      is_birthday_today: false,
      next_birthday_date: null,
    };
  }

  const { year, month, day } = parsed;
  const refYear = referenceDate.getFullYear();

  let age = refYear - year;
  const hasHadBirthdayThisYear =
    referenceDate.getMonth() + 1 > month ||
    (referenceDate.getMonth() + 1 === month && referenceDate.getDate() >= day);
  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  let nextBday = new Date(refYear, month - 1, day);
  if (nextBday < referenceDate) {
    nextBday = new Date(refYear + 1, month - 1, day);
  }

  const diffMs = nextBday.getTime() - referenceDate.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isToday = daysUntil === 0;
  const turningAge = nextBday.getFullYear() - year;

  const yyyy = nextBday.getFullYear();
  const mm = String(nextBday.getMonth() + 1).padStart(2, '0');
  const dd = String(nextBday.getDate()).padStart(2, '0');

  return {
    birth_year: year,
    birth_month: month,
    birth_day: day,
    age: Math.max(0, age),
    turning_age: Math.max(0, turningAge),
    days_until_birthday: daysUntil,
    is_birthday_today: isToday,
    next_birthday_date: `${yyyy}-${mm}-${dd}`,
  };
}

module.exports = { getLocalToday, parseDob, computeBirthdayInfo };
