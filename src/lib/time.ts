import type { Lang } from '../types/events';

/**
 * All filtering and time math happens in integer-year space (BC negative, PLAN.md §7.5).
 * JS Dates are used only for rendering in vis-timeline.
 */

/** `1346` → "1346", `-431` → "431. p.n.e." / "431 BC". */
export function formatYear(year: number, lang: Lang): string {
  if (year < 0) return lang === 'en' ? `${-year} BC` : `${-year}. p.n.e.`;
  return String(year);
}

/** "1331–1355" / "1346" (single year when there is no distinct end). */
export function formatYearRange(
  year: number,
  yearEnd: number | null | undefined,
  lang: Lang,
): string {
  if (yearEnd == null || yearEnd === year) return formatYear(year, lang);
  return `${formatYear(year, lang)} – ${formatYear(yearEnd, lang)}`;
}

/**
 * Integer year → Date at Jan 1. `new Date(year, 0, 1)` maps years 0–99 into the
 * 1900s, so always go through setFullYear, which handles year 0 and negatives.
 */
export function yearToDate(year: number): Date {
  const d = new Date(0);
  d.setUTCFullYear(year, 0, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Date → integer year (inverse of yearToDate). */
export function dateToYear(date: Date | number | string): number {
  const d = date instanceof Date ? date : new Date(date);
  return d.getUTCFullYear();
}

/** Phase 2 (OHM): year → tile date param. Kept here so time logic stays in one place. */
export function yearToOhmDate(year: number): string {
  const sign = year < 0 ? '-' : '';
  const abs = Math.abs(year).toString().padStart(4, '0');
  return `${sign}${abs}-01-01`;
}

export function clampRange(from: number, to: number): { from: number; to: number } {
  return from <= to ? { from, to } : { from: to, to: from };
}
