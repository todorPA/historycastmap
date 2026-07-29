import type { Lang } from '../types/events';
import { DATASETS, DEFAULT_DATASET, type DatasetName } from './data';

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
  episodeId: string | null;
  eventId: string | null;
  lang: Lang | null;
}

const PARAM = {
  data: 'data',
  from: 'from',
  to: 'to',
  episode: 'ep',
  event: 'e',
  lang: 'lang',
} as const;

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

  return {
    dataset,
    from: parseYear(params.get(PARAM.from)),
    to: parseYear(params.get(PARAM.to)),
    episodeId: params.get(PARAM.episode) || null,
    eventId: params.get(PARAM.event) || null,
    lang: rawLang === 'sr' || rawLang === 'en' ? rawLang : null,
  };
}

/** Builds the query string for the current view, omitting anything at its default. */
export function buildSearch(state: {
  dataset: DatasetName;
  from: number;
  to: number;
  isFullRange: boolean;
  episodeId: string | null;
  eventId: string | null;
  lang: Lang;
}): string {
  const params = new URLSearchParams();

  if (state.dataset !== DEFAULT_DATASET) params.set(PARAM.data, state.dataset);
  // A full range is the default view; spelling it out would just make links noisy.
  if (!state.isFullRange) {
    params.set(PARAM.from, String(state.from));
    params.set(PARAM.to, String(state.to));
  }
  if (state.episodeId) params.set(PARAM.episode, state.episodeId);
  if (state.eventId) params.set(PARAM.event, state.eventId);
  if (state.lang !== 'sr') params.set(PARAM.lang, state.lang);

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
