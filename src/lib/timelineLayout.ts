import { REGION_FAMILIES, type RegionFamily } from '../config/regionFamilies';
import { contrastRatio } from './contrast';
import type { MarkerState } from './episodeMarkers';
import type { EpisodeKind } from './episodeModel';
import { overlaps } from './episodeVisibility';
import { yearToX, type View } from './timelineAxis';

/**
 * Where every episode sits on the timeline (HANDOFF §12.3–§12.4): its mark, its label, and its
 * lane in its region row. Pure: text is measured by an injected function, so the browser passes a
 * canvas and the tests pass a fixed width.
 */

export type Measure = (text: string, bold: boolean) => number;

export interface LayoutEpisode {
  id: string;
  from: number;
  to: number;
  kind: EpisodeKind;
  anchor: number;
  family: RegionFamily | undefined;
}

export interface ItemLayout<E extends LayoutEpisode = LayoutEpisode> {
  ep: E;
  state: MarkerState;
  /** The mark: a diamond centred on `from` for points, the bar from `from` to `to + 1` otherwise. */
  m0: number;
  m1: number;
  /** Where the overflow tick goes: the anchor (mid-year for bars). */
  xa: number;
  /** The label's left edge and width (title, plus the date for hover and selection). */
  lx: number;
  lw: number;
  /** The label sits inside the bar, stuck to its visible left edge. */
  inside: boolean;
  /** The extent that must not overlap another item in the same lane. */
  e0: number;
  e1: number;
}

const LABEL_MAX = 280;
const DATE_GAP = 12;
const POINT_HALF = 7;
const MIN_BAR = 6;

export function layoutItem<E extends LayoutEpisode>(
  ep: E,
  text: { title: string; date: string },
  state: MarkerState,
  ctx: { view: View; widthPx: number; measure: Measure },
): ItemLayout<E> {
  const { view, widthPx, measure } = ctx;
  const X = (y: number) => yearToX(y, view, widthPx);
  const loud = state === 'selected' || state === 'hover';
  const lw = Math.min(measure(text.title, state === 'selected'), LABEL_MAX) + (loud ? DATE_GAP + measure(text.date, false) : 0);
  const point = ep.kind === 'point';
  const x0 = X(ep.from);
  const x1 = Math.max(X(ep.to + (point ? 0 : 1)), x0 + MIN_BAR);
  const xa = X(ep.anchor + (point ? 0 : 0.5));

  let m0: number, m1: number, lx: number;
  let inside = false;
  if (point) {
    m0 = x0 - POINT_HALF;
    m1 = x0 + POINT_HALF;
    lx = x0 + 11;
  } else {
    m0 = x0;
    m1 = x1;
    const visibleStart = Math.max(x0, 2);
    if (x1 - visibleStart > lw + 18) {
      inside = true;
      lx = visibleStart + 8;
    } else {
      lx = x1 + 6;
    }
  }
  const e0 = Math.min(m0, lx);
  const e1 = inside ? m1 : Math.max(m1, lx + lw) + 10;
  return { ep, state, m0, m1, xa, lx, lw, inside, e0, e1 };
}

const PRIORITY: Record<MarkerState, number> = { selected: 0, hover: 1, normal: 2, muted: 3, outside: 4 };

export interface Packed<E extends LayoutEpisode = LayoutEpisode> extends ItemLayout<E> {
  lane: number;
}

/**
 * Greedy first-fit into at most `cap` lanes, in priority order (selected, hovered, normal, muted,
 * outside; then left to right). The selection always gets a lane, even past the cap; anything
 * else that does not fit becomes an overflow tick.
 */
export function packRow<E extends LayoutEpisode>(items: ItemLayout<E>[], cap: number): { placed: Packed<E>[]; overflow: ItemLayout<E>[]; lanes: number } {
  const order = [...items].sort((a, b) => PRIORITY[a.state] - PRIORITY[b.state] || a.e0 - b.e0);
  const lanes: Array<Array<[number, number]>> = [];
  const placed: Packed<E>[] = [];
  const overflow: ItemLayout<E>[] = [];
  for (const it of order) {
    let lane = 0;
    while (lane < lanes.length && lanes[lane].some(([a, b]) => it.e0 < b && it.e1 > a)) lane++;
    if (lane >= cap && it.state !== 'selected') {
      overflow.push(it);
      continue;
    }
    (lanes[lane] ??= []).push([it.e0, it.e1]);
    placed.push({ ...it, lane });
  }
  return { placed, overflow, lanes: lanes.length };
}

export interface Row<E extends LayoutEpisode = LayoutEpisode> {
  family: RegionFamily;
  placed: Packed<E>[];
  overflow: ItemLayout<E>[];
  lanes: number;
  /** Track height: lanes · lane + 8, plus a 12 px strip for overflow ticks. */
  height: number;
  inWindow: number;
  total: number;
  /** The selected episode is in this row but scrolled off one side of the view. */
  edge: 'l' | 'r' | null;
  /** The row can be expanded (+N još) or collapsed again (Skupi). */
  toggle: 'more' | 'less' | null;
}

export const LANE_PX = { s: 24, m: 30, l: 40 } as const;
const CULL_PX = 20;

/** Top of an item's box inside its track. */
export const itemTop = (lane: number, lanePx: number) => 4 + lane * lanePx + 2;

/**
 * The rows, top to bottom. `episodes` are the ones the timeline shows — the matching set, plus the
 * selection — so a family with none of them gets no row. `window` is the active period, for the
 * row's `inWindow/total`.
 */
export function buildRows<E extends LayoutEpisode>(
  episodes: E[],
  ctx: {
    view: View;
    window: View;
    widthPx: number;
    measure: Measure;
    lanePx: number;
    cap: number;
    expanded: ReadonlySet<string>;
    selectedId: string | null;
    stateOf: (ep: E) => MarkerState;
    text: (ep: E) => { title: string; date: string };
    /** Counted in `inWindow/total`. The selection is drawn even when it does not match. */
    matches?: (ep: E) => boolean;
  },
): Row<E>[] {
  const rows: Row<E>[] = [];
  for (const family of REGION_FAMILIES) {
    const all = episodes.filter((e) => e.family?.id === family.id);
    if (all.length === 0) continue;
    const counted = ctx.matches ? all.filter(ctx.matches) : all;
    const items = all
      .map((ep) => layoutItem(ep, ctx.text(ep), ctx.stateOf(ep), ctx))
      .filter((it) => it.e1 >= -CULL_PX && it.e0 <= ctx.widthPx + CULL_PX);
    const expanded = ctx.expanded.has(family.id);
    const { placed, overflow, lanes } = packRow(items, expanded ? Infinity : ctx.cap);

    let edge: Row['edge'] = null;
    const sel = ctx.selectedId ? all.find((e) => e.id === ctx.selectedId) : undefined;
    if (sel) {
      if (yearToX(sel.to + (sel.kind === 'point' ? 0 : 1), ctx.view, ctx.widthPx) < 0) edge = 'l';
      else if (yearToX(sel.from, ctx.view, ctx.widthPx) > ctx.widthPx) edge = 'r';
    }

    rows.push({
      family,
      placed,
      overflow,
      lanes,
      height: Math.max(1, lanes) * ctx.lanePx + 8 + (overflow.length ? 12 : 0),
      inWindow: counted.filter((e) => overlaps(e.from, e.to, ctx.window)).length,
      total: counted.length,
      edge,
      toggle: overflow.length ? 'more' : expanded && lanes > ctx.cap ? 'less' : null,
    });
  }
  return rows;
}

const INK = '#1B130D';
const WHITE = '#FFFFFF';

/** Label colour inside a solid bar: ink, unless white reads better on that fill. */
export function labelInk(fill: string): string {
  return contrastRatio(fill, INK) >= contrastRatio(fill, WHITE) ? INK : WHITE;
}
