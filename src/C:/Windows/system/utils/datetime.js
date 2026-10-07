// Date and time helpers for the desktop gadgets. Names come from the
// browser's language through Intl. Vietnamese (navigator.language "vi...")
// gets Vietnamese-style calendars: weeks start on Monday and the weekday
// headings read T2 ... T7, CN.

export const getLocale = () => {
  try {
    return navigator.language || (navigator.languages || [])[0] || 'en-US';
  } catch (_e) {
    return 'en-US';
  }
};

export const isVietnamese = (locale = getLocale()) => /^vi(-|$)/i.test(locale);

const capitalize = (text) => (text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text);

const formatterCache = {};
const formatter = (locale, options) => {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (!formatterCache[key]) {
    try {
      formatterCache[key] = new Intl.DateTimeFormat(locale, options);
    } catch (_e) {
      formatterCache[key] = new Intl.DateTimeFormat('en-US', options);
    }
  }
  return formatterCache[key];
};

// "Wednesday", "Thứ Tư"
export const weekdayName = (date, locale = getLocale()) => capitalize(
  formatter(locale, { weekday: 'long' }).format(date),
);

// "October 2026", "Tháng 10 năm 2026"
export const monthYearName = (date, locale = getLocale()) => capitalize(
  formatter(locale, { month: 'long', year: 'numeric' }).format(date),
);

// A shorter title for the month grid: "October 2026", "Tháng 10/2026"
export const monthYearTitle = (date, locale = getLocale()) => (isVietnamese(locale)
  ? `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`
  : monthYearName(date, locale));

// 0 = Sunday, 1 = Monday ... as used by Date.getDay().
export const firstDayOfWeek = (locale = getLocale()) => {
  if (isVietnamese(locale)) return 1;
  try {
    const loc = new Intl.Locale(locale);
    const info = (typeof loc.getWeekInfo === 'function' && loc.getWeekInfo()) || loc.weekInfo;
    if (info && info.firstDay) return info.firstDay % 7;
  } catch (_e) {
    // Intl.Locale or week info not supported
  }
  return 0;
};

// Short weekday headings for a month grid, starting with firstDay.
export const weekdayLabels = (firstDay, locale = getLocale()) => {
  const labels = [];
  for (let i = 0; i < 7; i += 1) {
    const day = (firstDay + i) % 7;
    if (isVietnamese(locale)) {
      labels.push(day === 0 ? 'CN' : `T${day + 1}`);
    } else {
      // 2021-08-01 was a Sunday
      const short = formatter(locale, { weekday: 'short' }).format(new Date(2021, 7, 1 + day)).replace(/\./g, '');
      labels.push(short.length > 2 && /^[a-z]/i.test(short) ? short.slice(0, 2) : short);
    }
  }
  return labels;
};

/* ---------- time zones (for the Clock gadget) ---------- */

// A short list in the spirit of the Windows 7 time zone picker.
export const TIME_ZONES = [
  { zone: 'Pacific/Honolulu', label: 'Hawaii' },
  { zone: 'America/Anchorage', label: 'Alaska' },
  { zone: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)', city: 'Los Angeles' },
  { zone: 'America/Denver', label: 'Mountain Time (US & Canada)', city: 'Denver' },
  { zone: 'America/Chicago', label: 'Central Time (US & Canada)', city: 'Chicago' },
  { zone: 'America/New_York', label: 'Eastern Time (US & Canada)', city: 'New York' },
  { zone: 'America/Sao_Paulo', label: 'Brasilia, Sao Paulo', city: 'Sao Paulo' },
  { zone: 'UTC', label: 'Coordinated Universal Time', city: 'UTC' },
  { zone: 'Europe/London', label: 'London, Dublin, Lisbon' },
  { zone: 'Europe/Paris', label: 'Paris, Berlin, Rome, Madrid' },
  { zone: 'Europe/Moscow', label: 'Moscow, St. Petersburg' },
  { zone: 'Asia/Dubai', label: 'Abu Dhabi, Dubai', city: 'Dubai' },
  { zone: 'Asia/Kolkata', label: 'New Delhi, Mumbai, Kolkata', city: 'New Delhi' },
  { zone: 'Asia/Bangkok', label: 'Bangkok, Jakarta' },
  { zone: 'Asia/Ho_Chi_Minh', label: 'Hanoi, Ho Chi Minh City' },
  { zone: 'Asia/Shanghai', label: 'Beijing, Shanghai, Hong Kong', city: 'Beijing' },
  { zone: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur' },
  { zone: 'Asia/Seoul', label: 'Seoul' },
  { zone: 'Asia/Tokyo', label: 'Tokyo, Osaka' },
  { zone: 'Australia/Sydney', label: 'Sydney, Melbourne' },
  { zone: 'Pacific/Auckland', label: 'Auckland, Wellington' },
];

// Hours, minutes and seconds right now, either local or in an IANA time zone.
export const timeIn = (timeZone, date = new Date()) => {
  if (timeZone) {
    try {
      const parts = {};
      formatter('en-US', {
        timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
      }).formatToParts(date).forEach((p) => { parts[p.type] = p.value; });
      return { h: Number(parts.hour) % 24, m: Number(parts.minute), s: Number(parts.second) };
    } catch (_e) {
      // unknown time zone: fall back to local time
    }
  }
  return { h: date.getHours(), m: date.getMinutes(), s: date.getSeconds() };
};

// Minutes ahead of UTC for a time zone ('' = this computer).
export const zoneOffsetMinutes = (timeZone, date = new Date()) => {
  if (!timeZone) return -date.getTimezoneOffset();
  try {
    const p = {};
    formatter('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date).forEach((x) => { p[x.type] = x.value; });
    const asUtc = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour) % 24,
      Number(p.minute),
    );
    return Math.round((asUtc - (date.getTime() - (date.getTime() % 60000))) / 60000);
  } catch (_e) {
    return 0;
  }
};

// "(UTC+07:00)"
export const formatOffset = (minutes) => {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `(UTC${sign}${hh}:${mm})`;
};

// The city shown on a clock face for a time zone.
export const zoneCity = (timeZone) => {
  if (!timeZone) return '';
  const known = TIME_ZONES.find((z) => z.zone === timeZone);
  if (known) return known.city || known.label.split(',')[0];
  return timeZone.split('/').pop().replace(/_/g, ' ');
};
