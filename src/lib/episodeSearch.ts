import type { Lang, PlacesById } from '../types/events';
import { pick } from './i18n';
import { findFolded, fold } from './fold';
import type { EpisodeView } from './episodeModel';

/** Why an episode matched, for the list's match line (HANDOFF §5). */
export interface SearchHit {
  field: 'title' | 'number' | 'year' | 'event' | 'actor' | 'place';
  /** The text that matched, as shown: a chapter title, a person, a place, a year. */
  text: string;
  /** [start, end) of the match within `text`, for highlighting. Absent for years and numbers. */
  range?: [number, number];
  /** For chapter and year hits: the chapter's year, shown before it ("↳ 1389 · …"). */
  year?: number;
}

/**
 * Where does `query` match this episode? null for no match. Order matters: the title is
 * checked first, so a title hit is reported as such and the list shows no match line.
 * Expects a non-empty query — use matchesQuery for "does it pass the search box".
 */
export function searchEpisode(ep: EpisodeView, query: string, places: PlacesById, lang: Lang): SearchHit | null {
  const q = query.trim();
  if (!q) return null;

  for (const title of [ep.title.sr, ep.title.en ?? '']) {
    const r = title && findFolded(title, q);
    if (r) return { field: 'title', text: title, range: r };
  }

  if (/^\d{1,4}$/.test(q)) {
    const n = /^(\d+)/.exec(ep.id);
    if (n && Number(n[1]) === Number(q)) return { field: 'number', text: ep.id };
  }
  const year = parseYearQuery(q);
  if (year !== null && ep.from <= year && year <= ep.to) return { field: 'year', text: q, year };

  for (const e of ep.events) {
    const title = pick(e.title, lang);
    const r = findFolded(title, q);
    if (r) return { field: 'event', text: title, range: r, year: e.year };
  }
  for (const e of ep.events) {
    for (const actor of e.actors ?? []) {
      const r = findFolded(actor, q);
      if (r) return { field: 'actor', text: actor, range: r };
    }
  }
  for (const e of ep.events) {
    const name = places[e.placeId] ? pick(places[e.placeId].name, lang) : '';
    const r = name && findFolded(name, q);
    if (r) return { field: 'place', text: name, range: r };
  }
  return null;
}

/**
 * A search query read as a year, or null. Two to four digits (HANDOFF §5); a bare number is
 * AD. BC is accepted the way the app prints it — "48. p.n.e.", "48 BC" — plus "pne", "BCE"
 * and a leading minus, because years are stored negative (lib/time.ts) and nobody types that.
 */
export function parseYearQuery(query: string): number | null {
  const q = fold(query.trim());
  const ad = /^(\d{2,4})$/.exec(q);
  if (ad) return Number(ad[1]);
  const bc = /^(\d{2,4})\.?\s*(?:p\.?\s*n\.?\s*e\.?|pne|bce?)$/.exec(q) ?? /^-(\d{2,4})$/.exec(q);
  return bc ? -Number(bc[1]) : null;
}

/** Does the episode pass the search box? An empty query lets everything through. */
export function matchesQuery(ep: EpisodeView, query: string, places: PlacesById, lang: Lang): boolean {
  return query.trim() === '' || searchEpisode(ep, query, places, lang) !== null;
}
