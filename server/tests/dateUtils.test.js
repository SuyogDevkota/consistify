import {
  formatDateInTz,
  todayInTz,
  addDaysToDateKey,
  dateKeysBetween,
  isValidDateKey,
  weekdayOfDateKey,
} from '../src/utils/dateUtils.js';
import { computeStreaks } from '../src/services/analyticsService.js';

describe('Timezone & date boundaries', () => {
  test('validates date keys', () => {
    expect(isValidDateKey('2026-10-26')).toBe(true);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('not-a-date')).toBe(false);
  });

  test('addDays and range', () => {
    expect(addDaysToDateKey('2026-10-26', -1)).toBe('2026-10-25');
    expect(dateKeysBetween('2026-10-24', '2026-10-26')).toEqual([
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
    ]);
  });

  test('weekday of date key', () => {
    // 2026-10-26 is a Monday
    expect(weekdayOfDateKey('2026-10-26')).toBe(1);
  });

  test('format in timezone returns YYYY-MM-DD', () => {
    const key = formatDateInTz(new Date('2026-10-26T12:00:00Z'), 'UTC');
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayInTz('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('streaks ignore gaps', () => {
    const today = todayInTz('UTC');
    const y = addDaysToDateKey(today, -1);
    const y3 = addDaysToDateKey(today, -3);
    const s = computeStreaks([y3, y, today], 'UTC');
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });
});
