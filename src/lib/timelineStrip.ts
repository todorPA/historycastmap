import { itemTop, type LayoutEpisode, type Row } from './timelineLayout';
import type { View } from './timelineAxis';

/**
 * The overview strip under the axis (HANDOFF §12.6) and the rows' vertical rail (§12.7).
 */

const BINS = 90;
const BAR_MAX = 26;
const BAR_MIN = 3;

/** Bar heights of a 90-bin histogram of episode anchors over the whole extent; empty bins are 0. */
export function histogram(anchors: number[], bounds: View, bins = BINS): number[] {
  const counts = new Array<number>(bins).fill(0);
  const span = bounds.to - bounds.from;
  for (const a of anchors) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(((a - bounds.from) / span) * bins)));
    counts[i]++;
  }
  const max = Math.max(1, ...counts);
  return counts.map((c) => (c ? Math.max(BAR_MIN, (c / max) * BAR_MAX) : 0));
}

/** Start, middle (to the nearest century) and end of the extent. */
export function stripLabels(bounds: View): number[] {
  return [bounds.from, Math.round((bounds.from + bounds.to) / 2 / 100) * 100, bounds.to];
}

const THUMB_MIN = 28;
/** A row area within this many px of its scroll height counts as not scrollable. */
const SLACK = 4;

/** The rail thumb, or null when the rows fit and the rail is hidden. */
export function railThumb(p: { scrollTop: number; clientHeight: number; scrollHeight: number; railPx: number }): { top: number; height: number } | null {
  if (p.scrollHeight <= p.clientHeight + SLACK) return null;
  const height = Math.max(THUMB_MIN, (p.railPx * p.clientHeight) / p.scrollHeight);
  const top = ((p.railPx - height) * p.scrollTop) / (p.scrollHeight - p.clientHeight);
  return { top, height };
}

/** The rail position (thumb grabbed `grab` px below its top) back to a scrollTop. */
export function railToScroll(p: { y: number; grab: number; thumb: number; railPx: number; clientHeight: number; scrollHeight: number }): number {
  const f = Math.min(1, Math.max(0, (p.y - p.grab) / (p.railPx - p.thumb)));
  return f * (p.scrollHeight - p.clientHeight);
}

/**
 * How many episodes in the period lie below the visible part of the rows — the "Još N" pill.
 * Out-of-window items are not counted: the pill is about this period.
 */
export function itemsBelow<E extends LayoutEpisode>(rows: Row<E>[], lanePx: number, visibleBottom: number): number {
  let top = 0;
  let n = 0;
  for (const r of rows) {
    for (const p of r.placed) if (p.state !== 'outside' && top + itemTop(p.lane, lanePx) > visibleBottom - 6) n++;
    top += r.height;
  }
  return n;
}
