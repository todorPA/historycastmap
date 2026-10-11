import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { deriveEpisodes, type EpisodeView } from '../lib/episodeModel';
import { collectionMembers, type CollectionMembers } from '../lib/episodeFilters';
import { matchingEpisodes } from '../lib/episodeVisibility';
import type { LoadedData } from '../lib/data';
import { useFilters } from './FilterContext';
import { COLLECTIONS } from '../config/collections';
import { EPISODE_OVERRIDES } from '../config/episodeOverrides';

const DataContext = createContext<LoadedData | null>(null);
const EpisodesContext = createContext<EpisodeView[] | null>(null);

/** Derives the episode model once per dataset, for every view that reads it. */
export function DataProvider({ value, children }: { value: LoadedData; children: ReactNode }) {
  const episodes = useMemo(() => deriveEpisodes(value.data, EPISODE_OVERRIDES), [value.data]);
  return (
    <DataContext.Provider value={value}>
      <EpisodesContext.Provider value={episodes}>{children}</EpisodesContext.Provider>
    </DataContext.Provider>
  );
}

export function useData(): LoadedData {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

/** The episode model, derived once per dataset, with the hand-checked overrides applied. */
export function useEpisodes(): EpisodeView[] {
  const ctx = useContext(EpisodesContext);
  if (!ctx) throw new Error('useEpisodes must be used inside <DataProvider>');
  return ctx;
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
