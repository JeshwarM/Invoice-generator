import { format, addMonths, differenceInDays, isAfter, isBefore, isEqual, parseISO } from 'date-fns';

/**
 * Format date for display: "Sep 19, 2026"
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
}

/**
 * Format date for forms: "2026-09-19"
 */
export function formatInputDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/**
 * Format date for invoice: "Sep 19, 2026"
 */
export function formatInvoiceDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
}

/**
 * Calculate contract end date from start date and duration (months).
 */
export function calculateEndDate(startDate: Date, durationMonths: number): Date {
  const end = addMonths(startDate, durationMonths);
  // End date is the last day of the previous day (subtract 1 day)
  end.setDate(end.getDate() - 1);
  return end;
}

/**
 * Get days until a date from today.
 */
export function daysUntil(date: Date): number {
  return differenceInDays(date, new Date());
}

/**
 * Check if a date falls within a range (inclusive).
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return (isAfter(d, s) || isEqual(d, s)) && (isBefore(d, e) || isEqual(d, e));
}

/**
 * Get fiscal year string. E.g., for April 2026 - March 2027 -> "2627"
 * fiscalYearStartMonth: 1-12 (default 4 for April)
 */
export function getFiscalYear(date: Date, fiscalYearStartMonth: number = 4): string {
  const month = date.getMonth() + 1; // 1-based
  const year = date.getFullYear();
  const startYear = month >= fiscalYearStartMonth ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear.toString().slice(-2)}${endYear.toString().slice(-2)}`;
}

/**
 * Format days remaining as a human-readable string.
 */
export function formatDaysRemaining(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)} days ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}
