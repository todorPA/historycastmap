import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang, SeriesId } from '../types/events';
import { DEFAULT_BASEMAP_ID } from '../config/basemaps';

/** Timeline panel height. Shared because the map must re-fit when its own height changes. */
export const TIMELINE_SIZES = ['s', 'm', 'l'] as const;
export type TimelineSize = (typeof TIMELINE_SIZES)[number];

interface FilterContextValue {
  /** null = the whole archive. A curated set of episodes; see config/collections.ts. */
  activeCollectionId: string | null;
  toggleCollection: (id: string) => void;

  /** null = all episodes. */
  activeEpisodeId: string | null;
  /** Clicking the active episode again clears the filter. */
  toggleEpisode: (id: string) => void;
  clearEpisode: () => void;

  /** Empty = no restriction. Both are OR within a facet, AND across facets. */
  activeRegions: string[];
  toggleRegion: (region: string) => void;
  activeTypes: string[];
  toggleType: (type: string) => void;
  /** Same semantics, but the value lives on the episode rather than the event. */
  activeSeries: SeriesId[];
  toggleSeries: (series: SeriesId) => void;
  clearFacets: () => void;

  lang: Lang;
  setLang: (lang: Lang) => void;

  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;

  /** Basemap is state, not a hardcoded URL — Phase 2 adds the OHM option. */
  basemapId: string;
  setBasemapId: (id: string) => void;

  timelineSize: TimelineSize;
  setTimelineSize: (size: TimelineSize) => void;
  /** Kept for the header's double-click shortcut. */
  cycleTimelineSize: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({
  initial,
  children,
}: {
  /** Values lifted from a shared URL; anything absent falls back to the defaults. */
  initial?: {
    lang?: Lang | null;
    collectionId?: string | null;
    episodeId?: string | null;
    eventId?: string | null;
    basemapId?: string | null;
    regions?: string[] | null;
    types?: string[] | null;
    series?: SeriesId[] | null;
  };
  children: ReactNode;
}) {
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    initial?.collectionId ?? null,
  );
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(initial?.episodeId ?? null);
  const [activeRegions, setActiveRegions] = useState<string[]>(initial?.regions ?? []);
  const [activeTypes, setActiveTypes] = useState<string[]>(initial?.types ?? []);
  const [activeSeries, setActiveSeries] = useState<SeriesId[]>(initial?.series ?? []);
  const [lang, setLang] = useState<Lang>(initial?.lang ?? 'sr');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initial?.eventId ?? null);
  const [basemapId, setBasemapId] = useState<string>(initial?.basemapId ?? DEFAULT_BASEMAP_ID);
  const [timelineSize, setTimelineSize] = useState<TimelineSize>('s');

  const cycleTimelineSize = useCallback(() => {
    setTimelineSize(
      (prev) => TIMELINE_SIZES[(TIMELINE_SIZES.indexOf(prev) + 1) % TIMELINE_SIZES.length],
    );
  }, []);

  /**
   * Picking a collection drops the episode filter. The two compose (a collection narrows the
   * archive, an episode narrows it further) but an episode chosen before the collection is
   * usually not in it, and that combination reads as a broken filter: a named collection
   * showing nothing.
   */
  const toggleCollection = useCallback((id: string) => {
    setActiveCollectionId((prev) => (prev === id ? null : id));
    setActiveEpisodeId(null);
    setSelectedEventId(null);
  }, []);

  const toggleEpisode = useCallback((id: string) => {
    setActiveEpisodeId((prev) => (prev === id ? null : id));
    setSelectedEventId(null);
  }, []);

  const clearEpisode = useCallback(() => {
    setActiveEpisodeId(null);
    setSelectedEventId(null);
  }, []);

  /** Toggling a facet clears the selection: the selected event may no longer be visible. */
  const toggle = (value: string, list: string[]) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const toggleRegion = useCallback((region: string) => {
    setActiveRegions((prev) => toggle(region, prev));
    setSelectedEventId(null);
  }, []);

  const toggleType = useCallback((type: string) => {
    setActiveTypes((prev) => toggle(type, prev));
    setSelectedEventId(null);
  }, []);

  const toggleSeries = useCallback((series: SeriesId) => {
    setActiveSeries((prev) => toggle(series, prev) as SeriesId[]);
    setSelectedEventId(null);
  }, []);

  const clearFacets = useCallback(() => {
    setActiveRegions([]);
    setActiveTypes([]);
    setActiveSeries([]);
    setSelectedEventId(null);
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      activeCollectionId,
      toggleCollection,
      activeEpisodeId,
      toggleEpisode,
      clearEpisode,
      activeRegions,
      toggleRegion,
      activeTypes,
      toggleType,
      activeSeries,
      toggleSeries,
      clearFacets,
      lang,
      setLang,
      selectedEventId,
      setSelectedEventId,
      basemapId,
      setBasemapId,
      timelineSize,
      setTimelineSize,
      cycleTimelineSize,
    }),
    [
      activeCollectionId,
      toggleCollection,
      activeEpisodeId,
      toggleEpisode,
      clearEpisode,
      activeRegions,
      toggleRegion,
      activeTypes,
      toggleType,
      activeSeries,
      toggleSeries,
      clearFacets,
      lang,
      selectedEventId,
      basemapId,
      timelineSize,
      setTimelineSize,
      cycleTimelineSize,
    ],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside <FilterProvider>');
  return ctx;
}
