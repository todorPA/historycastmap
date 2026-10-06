import { ERAS, type Era } from '../config/eras';
import { overlaps } from './episodeVisibility';
import type { EpisodeView } from './episodeModel';

export type MarkerState = 'selected' | 'hover' | 'outside' | 'muted' | 'normal';

/**
 * How an episode's marker looks (HANDOFF §9.1, §11). Precedence, highest first: the selection;
 * hover (even outside the window, so its label can show); outside the timeline window; muted
 * while another episode is selected ("quiet others" — muted, never hidden); normal.
 * Filtered-out episodes have no state: they are not rendered at all.
 */
export function markerState(
  ep: EpisodeView,
  ctx: { selectedId: string | null; hoveredId: string | null; range: { from: number; to: number } },
): MarkerState {
  if (ep.id === ctx.selectedId) return 'selected';
  if (ep.id === ctx.hoveredId) return 'hover';
  if (!overlaps(ep.from, ep.to, ctx.range)) return 'outside';
  if (ctx.selectedId) return 'muted';
  return 'normal';
}

/** Cluster bubble diameter in px: 24 + min(22, 5·log2 n) (§9.1). */
export function clusterSize(n: number): number {
  return Math.round(24 + Math.min(22, 5 * Math.log2(n)));
}

/**
 * The cluster's ring: a conic gradient with one segment per era among its members, in era order,
 * each sized by its share — so the mix reads at a glance however the members arrived.
 */
export function eraRing(members: Array<{ era: Era }>): string {
  const counts = ERAS.map((era) => ({ era, n: members.filter((m) => m.era.id === era.id).length })).filter((c) => c.n > 0);
  let at = 0;
  const stops = counts.map(({ era, n }) => {
    const from = at;
    at += (n / members.length) * 100;
    return `${era.color} ${round(from)}% ${round(at)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** At this zoom and closer, a cluster click opens its list instead of zooming (§9.1). */
const LIST_FROM_ZOOM = 6.5;
/** A zooming click never goes closer than this (§9.1). */
const ZOOM_CEILING = 7;

/**
 * What a cluster click does (§9.1): open the list at 6.5 and closer, or when the members are
 * effectively one point (getBoundsZoom of a point is the map's maximum — Belgrade's 34 are one);
 * otherwise zoom towards the members, no closer than 7.
 *
 * Every zooming click gains at least some zoom: zooming to `fitZoom` alone would go nowhere when
 * the members already fit the view, which is the stuck click of Phase 2 in another form.
 */
export function clusterClick(p: { zoom: number; fitZoom: number; maxZoom: number }): 'list' | { zoomTo: number } {
  if (p.zoom >= LIST_FROM_ZOOM || p.fitZoom >= p.maxZoom) return 'list';
  return { zoomTo: Math.min(ZOOM_CEILING, Math.max(p.fitZoom, p.zoom + 1)) };
}

export interface ChapterPin {
  placeId: string;
  /** The number of the first chapter told at this place, as the card numbers chapters. */
  number: number;
  eventIds: string[];
}

/** One pin per chapter place of the selected episode, in audio order (§9.1). */
export function chapterPins(ep: EpisodeView): ChapterPin[] {
  const pins = new Map<string, ChapterPin>();
  ep.events.forEach((e, i) => {
    const pin = pins.get(e.placeId);
    if (pin) pin.eventIds.push(e.id);
    else pins.set(e.placeId, { placeId: e.placeId, number: i + 1, eventIds: [e.id] });
  });
  return [...pins.values()];
}
