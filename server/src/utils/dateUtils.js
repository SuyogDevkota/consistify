/**
 * Date helpers using group timezone (IANA) for day boundaries.
 * Completion dates are stored as YYYY-MM-DD in the group's timezone.
 */

export function formatDateInTz(date = new Date(), timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

export function todayInTz(timeZone = 'UTC') {
  return formatDateInTz(new Date(), timeZone);
}

export function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function dateKeysBetween(startKey, endKey) {
  const keys = [];
  let cur = startKey;
  while (cur <= endKey) {
    keys.push(cur);
    cur = addDaysToDateKey(cur, 1);
  }
  return keys;
}

export function daysAgoKey(days, timeZone = 'UTC') {
  const d = new Date();
  d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
  return formatDateInTz(d, timeZone);
}

export function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Weekday 0=Sun..6=Sat for a YYYY-MM-DD key (UTC calendar day). */
export function weekdayOfDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
