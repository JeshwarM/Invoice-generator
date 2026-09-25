import { describe, it, expect } from 'vitest';
import {
  calculateEndDate,
  isDateInRange,
  getFiscalYear,
  formatDaysRemaining,
} from '../utils/date';

describe('Date & Contract Utilities', () => {
  it('calculates contract end date correctly for 6 and 12 months', () => {
    const start = new Date(2026, 3, 1); // 1st April 2026
    const end6 = calculateEndDate(start, 6);
    // End date is day before 6 months from start
    expect(end6.getMonth()).toBe(8); // September
    expect(end6.getDate()).toBe(30);

    const end12 = calculateEndDate(start, 12);
    expect(end12.getFullYear()).toBe(2027);
    expect(end12.getMonth()).toBe(2); // March
    expect(end12.getDate()).toBe(31);
  });

  it('checks if delivery date falls within contract date range inclusive', () => {
    const start = new Date(2026, 3, 1); // April 1, 2026
    const end = new Date(2027, 2, 31); // March 31, 2027

    expect(isDateInRange(new Date(2026, 3, 1), start, end)).toBe(true);
    expect(isDateInRange(new Date(2026, 8, 15), start, end)).toBe(true);
    expect(isDateInRange(new Date(2027, 2, 31), start, end)).toBe(true);
    expect(isDateInRange(new Date(2026, 2, 31), start, end)).toBe(false);
    expect(isDateInRange(new Date(2027, 3, 1), start, end)).toBe(false);
  });

  it('generates the correct Indian fiscal year code (e.g. 2627)', () => {
    // April 2026 -> FY 2026-2027 -> "2627"
    expect(getFiscalYear(new Date(2026, 3, 15), 4)).toBe('2627');
    // January 2027 -> Still FY 2026-2027 -> "2627"
    expect(getFiscalYear(new Date(2027, 0, 15), 4)).toBe('2627');
    // March 2027 -> Still FY 2026-2027 -> "2627"
    expect(getFiscalYear(new Date(2027, 2, 31), 4)).toBe('2627');
    // April 2027 -> Next FY 2027-2028 -> "2728"
    expect(getFiscalYear(new Date(2027, 3, 1), 4)).toBe('2728');
  });

  it('formats days remaining string', () => {
    expect(formatDaysRemaining(0)).toBe('Expires today');
    expect(formatDaysRemaining(1)).toBe('Expires tomorrow');
    expect(formatDaysRemaining(15)).toBe('Expires in 15 days');
    expect(formatDaysRemaining(-5)).toBe('Expired 5 days ago');
  });
});
