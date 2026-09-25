import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HistoryEvent, SeriesId } from '../types/events';
import type { LoadedData } from '../lib/data';
import { useTime } from './TimeContext';
import { useFilters } from './FilterContext';
import { getCollection } from '../config/collections';

const DataContext = createContext<LoadedData | null>(null);

export function DataProvider({ value, children }: { value: LoadedData; children: ReactNode }) {
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): LoadedData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

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

/**
 * Episode ids for the active collection, as a Set so visibility stays O(1) per event.
 * Memoised on the id alone: the curated lists are static.
 */
export function useCollectionEpisodes(id: string | null): ReadonlySet<string> | null {
  return useMemo(() => {
    const collection = getCollection(id);
    return collection ? new Set(collection.episodeIds) : null;
  }, [id]);
}

/**
 * Episode ids in the side series, as a Set so visibility stays O(1) per event. Built once
 * from the loaded dataset; `series` is absent on datasets predating the field, which reads
 * as 'main' and leaves the set empty.
 */
export function useSideEpisodes(): ReadonlySet<string> {
  const { data } = useData();
  return useMemo(
    () => new Set(data.episodes.filter((e) => e.series === 'side').map((e) => e.id)),
    [data.episodes],
  );
}

/** The single derived list every view renders from. */
export function useVisibleEvents(): HistoryEvent[] {
  const { data } = useData();
  const { range } = useTime();
  const { activeCollectionId, activeEpisodeId, activeRegions, activeTypes, activeSeries } =
    useFilters();
  const activeCollectionEpisodes = useCollectionEpisodes(activeCollectionId);
  const sideEpisodeIds = useSideEpisodes();

  return useMemo(
    () =>
      data.events.filter((e) =>
        isVisible(e, {
          activeCollectionEpisodes,
          activeEpisodeId,
          activeRegions,
          activeTypes,
          activeSeries,
          sideEpisodeIds,
          range,
        }),
      ),
    [
      data.events,
      activeCollectionEpisodes,
      activeEpisodeId,
      activeRegions,
      activeTypes,
      activeSeries,
      sideEpisodeIds,
      range,
    ],
  );
}
