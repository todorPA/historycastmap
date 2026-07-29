import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

export function TimeProvider({
  bounds,
  initialRange,
  children,
}: {
  bounds: YearRange;
  /** From a shared URL, if it carried a period. Clamped to the dataset's own extent. */
  initialRange?: YearRange | null;
  children: ReactNode;
}) {
  const [range, setRangeState] = useState<YearRange>(() => {
    if (!initialRange) return bounds;
    return clampRange(
      Math.max(initialRange.from, bounds.from),
      Math.min(initialRange.to, bounds.to),
    );
  });

  // When the dataset changes (sample → full), snap back to its full extent. Skips the
  // first run: on mount the range may have come from a shared URL, which this would erase.
  const knownBounds = useRef(bounds);
  useEffect(() => {
    if (knownBounds.current.from === bounds.from && knownBounds.current.to === bounds.to) return;
    knownBounds.current = bounds;
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
