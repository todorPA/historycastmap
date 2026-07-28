import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clampRange } from '../lib/time';

export interface YearRange {
  from: number;
  to: number;
}

interface TimeContextValue {
  /** The one source of truth for time. Map, timeline and (Phase 2) basemap only read this. */
  range: YearRange;
  /** Full dataset extent — used to reset the range. */
  bounds: YearRange;
  setRange: (from: number, to: number) => void;
  resetRange: () => void;
  /** Focus year for time-aware layers (Phase 2 OHM): the end of the current range. */
  focusYear: number;
}

const TimeContext = createContext<TimeContextValue | null>(null);

export function TimeProvider({ bounds, children }: { bounds: YearRange; children: ReactNode }) {
  const [range, setRangeState] = useState<YearRange>(bounds);

  // When the dataset changes (sample → full), snap back to its full extent.
  useEffect(() => {
    setRangeState(bounds);
  }, [bounds.from, bounds.to]);

  const setRange = useCallback((from: number, to: number) => {
    setRangeState((prev) => {
      const next = clampRange(Math.round(from), Math.round(to));
      return prev.from === next.from && prev.to === next.to ? prev : next;
    });
  }, []);

  const resetRange = useCallback(() => setRangeState(bounds), [bounds.from, bounds.to]);

  const value = useMemo<TimeContextValue>(
    () => ({ range, bounds, setRange, resetRange, focusYear: range.to }),
    [range, bounds, setRange, resetRange],
  );

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>;
}

export function useTime(): TimeContextValue {
  const ctx = useContext(TimeContext);
  if (!ctx) throw new Error('useTime must be used inside <TimeProvider>');
  return ctx;
}
