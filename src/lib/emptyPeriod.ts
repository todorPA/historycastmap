import { overlaps } from './episodeVisibility';

/**
 * §20's empty-period state: filters match episodes, but none overlaps the window. Offers the one
 * nearest the window — by the gap between the window and its period — so one click gets back to
 * something. Null when the window is not empty, or nothing matches at all.
 */
export function nearestOutside<E extends { from: number; to: number; anchor: number }>(
  matching: E[],
  range: { from: number; to: number },
): E | null {
  if (matching.length === 0 || matching.some((e) => overlaps(e.from, e.to, range))) return null;
  const gap = (e: E) => (e.from > range.to ? e.from - range.to : range.from - e.to);
  let best: E | null = null;
  for (const e of matching) {
    if (!best || gap(e) < gap(best) || (gap(e) === gap(best) && e.anchor < best.anchor)) best = e;
  }
  return best;
}
