import { ERAS, type Era } from '../config/eras';

/**
 * The timeline's horizontal geometry (HANDOFF §12.1): year ↔ pixel, the adaptive axis and the era
 * band. A view is a float `{ from, to }` — the timeline animates between integer years.
 */
export interface View {
  from: number;
  to: number;
}

export function yearToX(year: number, view: View, widthPx: number): number {
  return ((year - view.from) / (view.to - view.from)) * widthPx;
}

export function xToYear(x: number, view: View, widthPx: number): number {
  return view.from + (x / widthPx) * (view.to - view.from);
}

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const MIN_TICK_PX = 70;

/** The first step whose ticks are at least 70 px apart. */
export function niceStep(pxPerYear: number): number {
  return STEPS.find((s) => s * pxPerYear >= MIN_TICK_PX) ?? 2000;
}

export interface Tick {
  year: number;
  x: number;
  /** Every fifth step: drawn in --tx at 500. */
  major: boolean;
}

export function axisTicks(view: View, widthPx: number): Tick[] {
  const step = niceStep(widthPx / (view.to - view.from));
  const ticks: Tick[] = [];
  for (let year = Math.ceil(view.from / step) * step; year <= view.to; year += step) {
    // `+ 0` turns -0 into 0, so the BC/AD formatter never sees a negative zero.
    ticks.push({ year: year + 0, x: yearToX(year, view, widthPx), major: year % (step * 5) === 0 });
  }
  return ticks;
}

export interface EraSegment {
  era: Era;
  x: number;
  width: number;
  showLabel: boolean;
}

const LABEL_MIN_PX = 60;

/** One segment per era in view, clipped to the view. */
export function eraSegments(view: View, widthPx: number): EraSegment[] {
  return ERAS.filter((e) => e.to > view.from && e.from < view.to).map((era) => {
    const x = Math.max(0, yearToX(era.from, view, widthPx));
    const width = Math.min(widthPx, yearToX(era.to, view, widthPx)) - x;
    return { era, x, width, showLabel: width > LABEL_MIN_PX };
  });
}
