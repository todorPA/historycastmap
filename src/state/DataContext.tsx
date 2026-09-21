import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HistoryEvent } from '../types/events';
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
  range: { from: number; to: number };
}

/**
 * An event is visible iff it passes every facet and overlaps the current year range. Spans
 * (yearEnd) count as overlapping, not just their start year. Within a facet values are OR'd
 * (Balkan or Asia), across facets AND'd (Balkan *and* a battle).
 */
export function isVisible(event: HistoryEvent, filters: VisibilityFilters): boolean {
  const { activeCollectionEpisodes, activeEpisodeId, activeRegions, activeTypes, range } = filters;
  // A collection is a set of episodes, so it narrows exactly like the episode filter does.
  if (activeCollectionEpisodes && !activeCollectionEpisodes.has(event.episodeId)) return false;
  if (activeEpisodeId != null && event.episodeId !== activeEpisodeId) return false;
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

/** The single derived list every view renders from. */
export function useVisibleEvents(): HistoryEvent[] {
  const { data } = useData();
  const { range } = useTime();
  const { activeCollectionId, activeEpisodeId, activeRegions, activeTypes } = useFilters();
  const activeCollectionEpisodes = useCollectionEpisodes(activeCollectionId);

  return useMemo(
    () =>
      data.events.filter((e) =>
        isVisible(e, {
          activeCollectionEpisodes,
          activeEpisodeId,
          activeRegions,
          activeTypes,
          range,
        }),
      ),
    [data.events, activeCollectionEpisodes, activeEpisodeId, activeRegions, activeTypes, range],
  );
}
