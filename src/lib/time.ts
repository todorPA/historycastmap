import type { Lang } from '../types/events';

/**
 * All filtering and time math happens in integer-year space (BC negative, PLAN.md §7.5).
 * No JS Dates: the timeline draws years directly.
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

/** Phase 2 (OHM): year → tile date param. Kept here so time logic stays in one place. */
export function yearToOhmDate(year: number): string {
  const sign = year < 0 ? '-' : '';
  const abs = Math.abs(year).toString().padStart(4, '0');
  return `${sign}${abs}-01-01`;
}

export function clampRange(from: number, to: number): { from: number; to: number } {
  return from <= to ? { from, to } : { from: to, to: from };
}
