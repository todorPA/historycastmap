import type { EraId } from '../config/eras';
import { eraOf } from '../config/eras';
import { EPISODE_OVERRIDES } from '../config/episodeOverrides';
import { deriveEpisodes } from '../lib/episodeModel';
import type { GeoData } from '../types/events';

/**
 * Every number the landing page states, computed from the dataset through the app's own episode
 * model — so the page and the map cannot disagree. Run at build time (vite/landingStats.ts).
 */
export interface CenturyRow {
  /** First year of the century: 1300 for the 14th, -100 for the 1st BC. */
  century: number;
  byEra: Partial<Record<EraId, number>>;
}

export interface ArchiveStats {
  episodes: number;
  chapters: number;
  /** Places with at least one chapter — not the whole gazetteer. */
  places: number;
  /** -1200 to 2000, one row per century, empty centuries included. */
  episodesByCentury: CenturyRow[];
  chaptersByCentury: CenturyRow[];
  /** Episodes by quarter of publication, oldest first, with the running total. */
  growth: Array<{ year: number; quarter: number; added: number; total: number }>;
}

export const FIRST_CENTURY = -1200;
export const LAST_CENTURY = 2000;
const STEP = 100;

const centuryOf = (year: number) => Math.floor(year / STEP) * STEP;

function rows(items: Array<{ year: number; era: EraId }>): CenturyRow[] {
  const out: CenturyRow[] = [];
  for (let c = FIRST_CENTURY; c <= LAST_CENTURY; c += STEP) out.push({ century: c, byEra: {} });
  for (const { year, era } of items) {
    const row = out[(centuryOf(year) - FIRST_CENTURY) / STEP];
    if (row) row.byEra[era] = (row.byEra[era] ?? 0) + 1;
  }
  return out;
}

export function archiveStats(data: GeoData): ArchiveStats {
  const episodes = deriveEpisodes(data, EPISODE_OVERRIDES);

  const quarters = new Map<string, { year: number; quarter: number; added: number }>();
  for (const e of data.episodes) {
    if (!e.pubDate) continue;
    const d = new Date(e.pubDate);
    if (Number.isNaN(d.getTime())) continue;
    const year = d.getUTCFullYear();
    const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
    const key = `${year}-${quarter}`;
    const q = quarters.get(key) ?? { year, quarter, added: 0 };
    q.added++;
    quarters.set(key, q);
  }
  let total = 0;
  const growth = [...quarters.values()]
    .sort((a, b) => a.year - b.year || a.quarter - b.quarter)
    .map((q) => ({ ...q, total: (total += q.added) }));

  return {
    episodes: episodes.length,
    chapters: data.events.length,
    places: new Set(data.events.map((e) => e.placeId)).size,
    // An episode sits in the century of its anchor, in its era's colour, as on the map.
    episodesByCentury: rows(episodes.map((e) => ({ year: e.anchor, era: e.era.id }))),
    chaptersByCentury: rows(data.events.map((e) => ({ year: e.year, era: eraOf(e.year).id }))),
    growth,
  };
}
