import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Lang } from '../types/events';
import { DEFAULT_BASEMAP_ID } from '../config/basemaps';

interface FilterContextValue {
  /** null = all episodes. */
  activeEpisodeId: string | null;
  /** Clicking the active episode again clears the filter. */
  toggleEpisode: (id: string) => void;
  clearEpisode: () => void;

  lang: Lang;
  setLang: (lang: Lang) => void;

  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;

  /** Basemap is state, not a hardcoded URL — Phase 2 adds the OHM option. */
  basemapId: string;
  setBasemapId: (id: string) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('sr');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [basemapId, setBasemapId] = useState<string>(DEFAULT_BASEMAP_ID);

  const toggleEpisode = useCallback((id: string) => {
    setActiveEpisodeId((prev) => (prev === id ? null : id));
    setSelectedEventId(null);
  }, []);

  const clearEpisode = useCallback(() => {
    setActiveEpisodeId(null);
    setSelectedEventId(null);
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      activeEpisodeId,
      toggleEpisode,
      clearEpisode,
      lang,
      setLang,
      selectedEventId,
      setSelectedEventId,
      basemapId,
      setBasemapId,
    }),
    [activeEpisodeId, toggleEpisode, clearEpisode, lang, selectedEventId, basemapId],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside <FilterProvider>');
  return ctx;
}
