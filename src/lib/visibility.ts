import type { HistoryEvent, SeriesId } from '../types/events';

/**
 * The visibility rule every view renders from, kept free of React so it can be tested
 * directly (visibility.test.ts). The map, the sidebar counts and the timeline all go through
 * this one function — the timeline once had its own copy that forgot the facets, and the two
 * halves of the app then disagreed about which events existed.
 */

export interface VisibilityFilters {
  /** Episode ids in the active collection, or null when the whole archive is in play. */
  activeCollectionEpisodes?: ReadonlySet<string> | null;
  activeEpisodeId: string | null;
  activeRegions: string[];
  activeTypes: string[];
  activeSeries?: SeriesId[];
  /**
   * Episode ids in the side series. Passed in rather than looked up per event: series lives
   * on the episode, not the event, and a Set keeps visibility O(1) the way
   * `activeCollectionEpisodes` already does.
   */
  sideEpisodeIds?: ReadonlySet<string> | null;
  range: { from: number; to: number };
}

/**
 * An event is visible iff it passes every facet and overlaps the current year range. Spans
 * (yearEnd) count as overlapping, not just their start year. Within a facet values are OR'd
 * (Balkan or Asia), across facets AND'd (Balkan *and* a battle).
 */
export function isVisible(event: HistoryEvent, filters: VisibilityFilters): boolean {
  const {
    activeCollectionEpisodes,
    activeEpisodeId,
    activeRegions,
    activeTypes,
    activeSeries,
    sideEpisodeIds,
    range,
  } = filters;
  // A collection is a set of episodes, so it narrows exactly like the episode filter does.
  if (activeCollectionEpisodes && !activeCollectionEpisodes.has(event.episodeId)) return false;
  if (activeEpisodeId != null && event.episodeId !== activeEpisodeId) return false;
  if (activeSeries && activeSeries.length > 0) {
    const series = sideEpisodeIds?.has(event.episodeId) ? 'side' : 'main';
    if (!activeSeries.includes(series)) return false;
  }
  if (activeRegions.length > 0 && !activeRegions.includes(event.region ?? '')) return false;
  if (activeTypes.length > 0 && !activeTypes.includes(event.type ?? '')) return false;
  const start = event.year;
  const end = event.yearEnd ?? event.year;
  return end >= range.from && start <= range.to;
}
