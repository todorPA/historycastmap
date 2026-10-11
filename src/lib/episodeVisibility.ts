import type { Lang, PlacesById } from '../types/events';
import type { EpisodeView } from './episodeModel';
import { matchesFilters, type CollectionMembers, type EpisodeFilterState } from './episodeFilters';
import { matchesQuery } from './episodeSearch';

/**
 * The one rule for which episodes are in play: they pass the filters AND the search. The
 * selected episode always stays, even when a filter would exclude it (HANDOFF §6.5) — otherwise
 * changing a filter could pull the open card's episode out from under it.
 */
export function matchingEpisodes(
  episodes: EpisodeView[],
  f: EpisodeFilterState,
  members: CollectionMembers,
  query: string,
  places: PlacesById,
  lang: Lang,
  selectedId: string | null,
): EpisodeView[] {
  return episodes.filter(
    (e) => e.id === selectedId || (matchesFilters(e, f, members) && matchesQuery(e, query, places, lang)),
  );
}

/** Does a span overlap the window? A span counts, not just its start. */
export function overlaps(from: number, to: number, range: { from: number; to: number }): boolean {
  return to >= range.from && from <= range.to;
}
