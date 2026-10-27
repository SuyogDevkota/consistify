import { describe, expect, test } from 'vitest';
import { firstName, toDateKey, userInitial } from './format.js';

describe('format helpers', () => {
  test('userInitial uses first character', () => {
    expect(userInitial('alice')).toBe('A');
    expect(userInitial('')).toBe('?');
  });

  test('firstName splits display names', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
    expect(firstName('')).toBe('there');
  });

  test('toDateKey is local YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 9, 26))).toBe('2026-10-26');
  });
});
