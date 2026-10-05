import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HistoryEvent } from '../types/events';
import { isVisible } from '../lib/visibility';
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
