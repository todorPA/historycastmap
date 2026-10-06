import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HistoryEvent } from '../types/events';
import { deriveEpisodes, type EpisodeView } from '../lib/episodeModel';
import { collectionMembers, type CollectionMembers } from '../lib/episodeFilters';
import { matchingEpisodes, visibleEvents } from '../lib/episodeVisibility';
import type { LoadedData } from '../lib/data';
import { useTime } from './TimeContext';
import { useFilters } from './FilterContext';
import { COLLECTIONS } from '../config/collections';
import { EPISODE_OVERRIDES } from '../config/episodeOverrides';

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

/** The episode model, derived once per dataset, with the hand-checked overrides applied. */
export function useEpisodes(): EpisodeView[] {
  const { data } = useData();
  return useMemo(() => deriveEpisodes(data, EPISODE_OVERRIDES), [data]);
}

const MEMBERS = collectionMembers(COLLECTIONS);

/** Collection id → episode ids. Static: the curated lists ship with the code. */
export function useCollectionMembers(): CollectionMembers {
  return MEMBERS;
}

/** Episodes passing filters and search; the selected one always stays (lib/episodeVisibility.ts). */
export function useMatchingEpisodes(): EpisodeView[] {
  const episodes = useEpisodes();
  const { placesById } = useData();
  const { filters, query, lang, selectedEpisodeId } = useFilters();
  return useMemo(
    () => matchingEpisodes(episodes, filters, MEMBERS, query, placesById, lang, selectedEpisodeId),
    [episodes, filters, query, placesById, lang, selectedEpisodeId],
  );
}

/** The events the map draws: chapters of matching episodes, inside the time window. */
export function useVisibleEvents(): HistoryEvent[] {
  const { data } = useData();
  const { range } = useTime();
  const { selectedEpisodeId } = useFilters();
  const matching = useMatchingEpisodes();
  return useMemo(
    () => visibleEvents(data.events, new Set(matching.map((e) => e.id)), selectedEpisodeId, range),
    [data.events, matching, selectedEpisodeId, range],
  );
}
