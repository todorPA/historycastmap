import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { HistoryEvent } from '../types/events';
import type { LoadedData } from '../lib/data';
import { useTime } from './TimeContext';
import { useFilters } from './FilterContext';

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
 * An event is visible iff it passes the episode filter and overlaps the current
 * year range. Spans (yearEnd) count as overlapping, not just their start year.
 */
export function isVisible(
  event: HistoryEvent,
  activeEpisodeId: string | null,
  range: { from: number; to: number },
): boolean {
  if (activeEpisodeId != null && event.episodeId !== activeEpisodeId) return false;
  const start = event.year;
  const end = event.yearEnd ?? event.year;
  return end >= range.from && start <= range.to;
}

/** The single derived list every view renders from. */
export function useVisibleEvents(): HistoryEvent[] {
  const { data } = useData();
  const { range } = useTime();
  const { activeEpisodeId } = useFilters();

  return useMemo(
    () => data.events.filter((e) => isVisible(e, activeEpisodeId, range)),
    [data.events, activeEpisodeId, range],
  );
}
