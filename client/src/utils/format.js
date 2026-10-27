/** Shared display helpers (no scoring logic — backend remains source of truth). */

export function userInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export function formatLongDate(date = new Date()) {
  return date
    .toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();
}

export function formatMonthLabel(year, month) {
  return new Date(year, month - 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function firstName(fullName) {
  return (fullName || 'there').trim().split(/\s+/)[0];
}
