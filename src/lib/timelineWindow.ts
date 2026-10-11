import type { Era } from '../config/eras';
import type { View } from './timelineAxis';

/**
 * The Window: the active period, moved and resized on the overview strip (HANDOFF §12.2). Every
 * function returns a view already clamped to the bounds, so callers can tween straight to it.
 */

export const MIN_SPAN = 8;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Span held to [8 years, the bounds], then shifted — not shrunk — to fit inside them. */
export function clampView(from: number, to: number, bounds: View, minSpan = MIN_SPAN): View {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const span = clamp(b - a, minSpan, bounds.to - bounds.from);
  const start = clamp(a, bounds.from, bounds.to - span);
  return { from: start, to: start + span };
}

/** `factor` < 1 zooms in (`+` uses 0.6), > 1 zooms out, around the window's centre. */
export function zoomView(view: View, factor: number, bounds: View): View {
  const c = (view.from + view.to) / 2;
  return clampView(c - (c - view.from) * factor, c + (view.to - c) * factor, bounds);
}

/** A click on the strip outside the window centres the window there. */
export function centreView(view: View, year: number, bounds: View): View {
  const half = (view.to - view.from) / 2;
  return clampView(year - half, year + half, bounds);
}

/** Dragging the window body. `start` is the view at pointer-down. */
export function moveView(start: View, dYears: number, bounds: View): View {
  return clampView(start.from + dYears, start.to + dYears, bounds);
}

/** Dragging a side handle; the opposite edge stays put. */
export function resizeView(start: View, handle: 'l' | 'r', dYears: number, bounds: View): View {
  if (handle === 'l') {
    const from = clamp(start.from + dYears, bounds.from, start.to - MIN_SPAN);
    return { from, to: start.to };
  }
  const to = clamp(start.to + dYears, start.from + MIN_SPAN, bounds.to);
  return { from: start.from, to };
}

const WIDE_WINDOW = 700;
const LONG_SHARE = 0.8;
const EDGE_SHARE = 0.1;
const CONTEXT_MIN = 320;

/**
 * Where the window goes when an episode is selected, or null to leave it. A wide window, or an
 * episode that nearly fills it, gives way to `max(3 × the episode, 320 years)` on its anchor; an
 * episode near an edge is only recentred; one comfortably inside changes nothing.
 */
export function selectionView(view: View, ep: { from: number; to: number; anchor: number }, bounds: View): View | null {
  const span = view.to - view.from;
  const epSpan = ep.to - ep.from + 1;
  let next: View | null = null;
  if (span > WIDE_WINDOW || epSpan > span * LONG_SHARE) {
    const ctx = Math.max(epSpan * 3, CONTEXT_MIN);
    next = clampView(ep.anchor - ctx / 2, ep.anchor + ctx / 2, bounds);
  } else if (ep.from < view.from + span * EDGE_SHARE || ep.to > view.to - span * EDGE_SHARE) {
    next = clampView(ep.anchor - span / 2, ep.anchor + span / 2, bounds);
  }
  if (!next || (next.from === view.from && next.to === view.to)) return null;
  return next;
}

const ERA_PAD = 0.04;

/** An era band click (and the map legend): the era, cut to the bounds, with 4 % either side. */
export function eraView(era: Era, bounds: View): View {
  const a = Math.max(era.from, bounds.from);
  const b = Math.min(era.to, bounds.to);
  const pad = (b - a) * ERA_PAD;
  return clampView(a - pad, b + pad, bounds);
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
