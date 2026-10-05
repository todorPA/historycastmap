import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang, SeriesId } from '../types/events';
import { DEFAULT_BASEMAP_ID } from '../config/basemaps';
import { EMPTY_FILTERS, type EpisodeFilterState, type FilterGroup } from '../lib/episodeFilters';
import { toggleFilterValue, toggleSelection } from './filterState';

/** Timeline panel height. Shared because the map must re-fit when its own height changes. */
export const TIMELINE_SIZES = ['s', 'm', 'l'] as const;
export type TimelineSize = (typeof TIMELINE_SIZES)[number];

interface FilterContextValue {
  // ---------- episode-level state (HANDOFF §5–§8) ----------
  /** Active values per filter group. Empty group = no restriction. */
  filters: EpisodeFilterState;
  toggleFilter: (group: FilterGroup, value: string) => void;
  /** Clears all four groups, Zbirke included (§6.4). */
  clearFilters: () => void;
  query: string;
  setQuery: (q: string) => void;
  selectedEpisodeId: string | null;
  selectEpisode: (id: string | null) => void;
  /** Picking the selected episode again deselects it (§7). */
  toggleEpisode: (id: string) => void;
  /** Shared so a hover in one view can highlight the same episode in the others (§17). */
  hoveredEpisodeId: string | null;
  setHoveredEpisodeId: (id: string | null) => void;

  // ---------- unchanged ----------
  lang: Lang;
  setLang: (lang: Lang) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  /** Basemap is state, not a hardcoded URL. */
  basemapId: string;
  setBasemapId: (id: string) => void;
  timelineSize: TimelineSize;
  setTimelineSize: (size: TimelineSize) => void;
  /** Kept for the header's double-click shortcut. */
  cycleTimelineSize: () => void;

  // ---------- deprecated: derived from the state above while components migrate ----------
  /** @deprecated first active collection; use `filters.collections`. */
  activeCollectionId: string | null;
  /** @deprecated single-select collection toggle; use `toggleFilter('collections', id)`. */
  toggleCollection: (id: string) => void;
  /** @deprecated use `selectedEpisodeId`. */
  activeEpisodeId: string | null;
  /** @deprecated use `selectEpisode(null)`. */
  clearEpisode: () => void;
  /** @deprecated use `filters.regions` / `filters.types` / `filters.series`. */
  activeRegions: string[];
  activeTypes: string[];
  activeSeries: SeriesId[];
  /** @deprecated use `toggleFilter`. */
  toggleRegion: (region: string) => void;
  toggleType: (type: string) => void;
  toggleSeries: (series: SeriesId) => void;
  /** @deprecated clears region, type and series only; use `clearFilters`. */
  clearFacets: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({
  initial,
  children,
}: {
  /** Values lifted from a shared URL; anything absent falls back to the defaults. */
  initial?: {
    lang?: Lang | null;
    collections?: string[] | null;
    episodeId?: string | null;
    eventId?: string | null;
    basemapId?: string | null;
    regions?: string[] | null;
    types?: string[] | null;
    series?: SeriesId[] | null;
  };
  children: ReactNode;
}) {
  const [filters, setFilters] = useState<EpisodeFilterState>(() => ({
    collections: initial?.collections ?? [],
    series: initial?.series ?? [],
    regions: initial?.regions ?? [],
    types: initial?.types ?? [],
  }));
  const [query, setQuery] = useState('');
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(initial?.episodeId ?? null);
  const [hoveredEpisodeId, setHoveredEpisodeId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>(initial?.lang ?? 'sr');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initial?.eventId ?? null);
  const [basemapId, setBasemapId] = useState<string>(initial?.basemapId ?? DEFAULT_BASEMAP_ID);
  const [timelineSize, setTimelineSize] = useState<TimelineSize>('s');

  const cycleTimelineSize = useCallback(() => {
    setTimelineSize(
      (prev) => TIMELINE_SIZES[(TIMELINE_SIZES.indexOf(prev) + 1) % TIMELINE_SIZES.length],
    );
  }, []);

  /** Any filter change drops the selected *event*: it may no longer be on screen. */
  const toggleFilter = useCallback((group: FilterGroup, value: string) => {
    setFilters((prev) => toggleFilterValue(prev, group, value));
    setSelectedEventId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setSelectedEventId(null);
  }, []);

  const selectEpisode = useCallback((id: string | null) => {
    setSelectedEpisodeId(id);
    setSelectedEventId(null);
  }, []);

  const toggleEpisode = useCallback((id: string) => {
    setSelectedEpisodeId((prev) => toggleSelection(prev, id));
    setSelectedEventId(null);
  }, []);

  // ---------- deprecated adapter ----------
  const toggleCollection = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, collections: prev.collections[0] === id ? [] : [id] }));
    setSelectedEpisodeId(null);
    setSelectedEventId(null);
  }, []);
  const clearEpisode = useCallback(() => selectEpisode(null), [selectEpisode]);
  const toggleRegion = useCallback((v: string) => toggleFilter('regions', v), [toggleFilter]);
  const toggleType = useCallback((v: string) => toggleFilter('types', v), [toggleFilter]);
  const toggleSeries = useCallback((v: SeriesId) => toggleFilter('series', v), [toggleFilter]);
  const clearFacets = useCallback(() => {
    setFilters((prev) => ({ ...EMPTY_FILTERS, collections: prev.collections }));
    setSelectedEventId(null);
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      toggleFilter,
      clearFilters,
      query,
      setQuery,
      selectedEpisodeId,
      selectEpisode,
      toggleEpisode,
      hoveredEpisodeId,
      setHoveredEpisodeId,
      lang,
      setLang,
      selectedEventId,
      setSelectedEventId,
      basemapId,
      setBasemapId,
      timelineSize,
      setTimelineSize,
      cycleTimelineSize,
      activeCollectionId: filters.collections[0] ?? null,
      toggleCollection,
      activeEpisodeId: selectedEpisodeId,
      clearEpisode,
      activeRegions: filters.regions,
      activeTypes: filters.types,
      activeSeries: filters.series,
      toggleRegion,
      toggleType,
      toggleSeries,
      clearFacets,
    }),
    [
      filters, toggleFilter, clearFilters, query, selectedEpisodeId, selectEpisode, toggleEpisode,
      hoveredEpisodeId, lang, selectedEventId, basemapId, timelineSize, cycleTimelineSize,
      toggleCollection, clearEpisode, toggleRegion, toggleType, toggleSeries, clearFacets,
    ],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside <FilterProvider>');
  return ctx;
}
