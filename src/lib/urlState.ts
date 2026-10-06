import type { Lang, SeriesId } from '../types/events';
import { EVENT_TYPES } from '../types/events';
import { REGION_COLORS } from '../config/regions';
import { DATASETS, DEFAULT_DATASET, type DatasetName } from './data';
import { BASEMAPS, DEFAULT_BASEMAP_ID } from '../config/basemaps';
import { COLLECTIONS } from '../config/collections';

/** The closed region set, taken from the palette so the two can never drift apart. */
const REGION_NAMES = Object.keys(REGION_COLORS);
const COLLECTION_IDS = COLLECTIONS.map((c) => c.id);

/**
 * The shareable view lives in the query string, so a link reproduces exactly what the
 * sender sees: dataset, period, episode filter, selected event, language.
 *
 * Every field is optional and independently validated — a hand-edited or truncated URL
 * degrades to defaults instead of breaking the app.
 */
export interface UrlState {
  dataset: DatasetName;
  from: number | null;
  to: number | null;
  collections: string[] | null;
  episodeId: string | null;
  eventId: string | null;
  lang: Lang | null;
  basemapId: string | null;
  regions: string[] | null;
  types: string[] | null;
  series: SeriesId[] | null;
}

const PARAM = {
  data: 'data',
  from: 'from',
  to: 'to',
  collection: 'col',
  episode: 'ep',
  event: 'e',
  lang: 'lang',
  basemap: 'bm',
  regions: 'r',
  types: 'ty',
  series: 'se',
} as const;

/**
 * Comma-separated lists; empty or missing means "no restriction". Each value is kept once, in
 * first-seen order: a duplicated value in a hand-edited link would otherwise become two active
 * filters for one thing — a badge reading 2 and two identical chips.
 */
function parseList(raw: string | null): string[] | null {
  if (!raw) return null;
  const values = [...new Set(raw.split(',').map((v) => v.trim()).filter(Boolean))];
  return values.length > 0 ? values : null;
}

/**
 * Same, narrowed to the known series. An unknown value is dropped rather than kept: a
 * hand-edited `?se=podcast` would otherwise match no episode and empty the map with no
 * visible cause.
 */
function parseSeries(raw: string | null): SeriesId[] | null {
  const values = parseList(raw)?.filter((v): v is SeriesId => v === 'main' || v === 'side');
  return values && values.length > 0 ? values : null;
}

/**
 * Region and type are validated against their closed sets for the same reason, and it is the
 * same failure: both are AND'ed into visibility, so one unrecognised value in a shared link
 * silently yields an empty map and a filter chip the reader cannot account for. Unknown
 * entries are dropped and the recognised ones still apply; if nothing survives, the facet
 * degrades to "no restriction" rather than to "match nothing".
 *
 * `region` is checked against the palette keys because that is the same closed set the
 * timeline groups by and the validator enforces (scripts/validate-data.mjs).
 */
function parseAllowed(raw: string | null, allowed: readonly string[]): string[] | null {
  const values = parseList(raw)?.filter((v) => allowed.includes(v));
  return values && values.length > 0 ? values : null;
}

function parseYear(raw: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  // Integer years only (BC negative) — see PLAN.md §7.5.
  return Number.isInteger(n) ? n : null;
}

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);

  const rawData = params.get(PARAM.data);
  const dataset =
    rawData && Object.prototype.hasOwnProperty.call(DATASETS, rawData)
      ? (rawData as DatasetName)
      : DEFAULT_DATASET;

  const rawLang = params.get(PARAM.lang);
  const rawBasemap = params.get(PARAM.basemap);

  return {
    dataset,
    from: parseYear(params.get(PARAM.from)),
    to: parseYear(params.get(PARAM.to)),
    // A list since collections became multi-select; a legacy single id is a one-item list.
    // Validated against the curated list, so a renamed collection drops out instead of
    // matching nothing.
    collections: parseAllowed(params.get(PARAM.collection), COLLECTION_IDS),
    episodeId: params.get(PARAM.episode) || null,
    eventId: params.get(PARAM.event) || null,
    lang: rawLang === 'sr' || rawLang === 'en' ? rawLang : null,
    // Validated against the registry, so an unknown id falls back to the default layer.
    basemapId: rawBasemap && BASEMAPS.some((b) => b.id === rawBasemap) ? rawBasemap : null,
    regions: parseAllowed(params.get(PARAM.regions), REGION_NAMES),
    types: parseAllowed(params.get(PARAM.types), EVENT_TYPES),
    // Validated against the two known values, so a hand-edited URL can't filter to nothing.
    series: parseSeries(params.get(PARAM.series)),
  };
}

/** Builds the query string for the current view, omitting anything at its default. */
export function buildSearch(state: {
  dataset: DatasetName;
  from: number;
  to: number;
  isFullRange: boolean;
  collections: string[];
  episodeId: string | null;
  eventId: string | null;
  lang: Lang;
  basemapId: string;
  regions: string[];
  types: string[];
  series: SeriesId[];
}): string {
  const params = new URLSearchParams();

  if (state.dataset !== DEFAULT_DATASET) params.set(PARAM.data, state.dataset);
  // A full range is the default view; spelling it out would just make links noisy.
  if (!state.isFullRange) {
    params.set(PARAM.from, String(state.from));
    params.set(PARAM.to, String(state.to));
  }
  if (state.collections.length > 0) params.set(PARAM.collection, state.collections.join(','));
  if (state.episodeId) params.set(PARAM.episode, state.episodeId);
  if (state.eventId) params.set(PARAM.event, state.eventId);
  if (state.lang !== 'sr') params.set(PARAM.lang, state.lang);
  if (state.basemapId !== DEFAULT_BASEMAP_ID) params.set(PARAM.basemap, state.basemapId);
  if (state.regions.length > 0) params.set(PARAM.regions, state.regions.join(','));
  if (state.types.length > 0) params.set(PARAM.types, state.types.join(','));
  if (state.series.length > 0) params.set(PARAM.series, state.series.join(','));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * replaceState, not pushState: scrubbing the timeline would otherwise stack hundreds of
 * history entries and make the back button useless.
 */
export function replaceUrl(search: string): void {
  if (typeof window === 'undefined') return;
  const next = `${window.location.pathname}${search}${window.location.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  window.history.replaceState(null, '', next);
}
