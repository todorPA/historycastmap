import { useCallback, useEffect, useRef, useState } from 'react';
import { useTime } from '../state/TimeContext';

/**
 * Walks the year window forward across the archive.
 *
 * The timeline is already the transport: it has an axis and a draggable window, so playback
 * adds no progress bar and no scrubber. It only moves the window that is already there, and
 * the year readout beside the button doubles as the progress display.
 */

/** Years advanced per second of wall time. A multiplier would be meaningless here. */
export const SPEEDS = [40, 120, 400] as const;
export type Speed = (typeof SPEEDS)[number];
export const DEFAULT_SPEED: Speed = 120;

/**
 * State is pushed at ~10Hz, not once per frame. Every change re-filters the events and makes
 * Leaflet diff its markers, which at 60Hz is a lot of work to express a difference nobody can
 * see. Elapsed wall time drives the arithmetic, so the speed stays honest whatever the cadence.
 */
const STEP_MS = 100;
const REDUCED_STEP_MS = 320;

/**
 * Width to use when the window is (near enough) the whole archive. Playing a window that
 * already spans everything would advance nothing, so a full-range start gets a century-ish
 * window at the beginning of the record instead of silently doing nothing.
 */
const DEFAULT_WINDOW_YEARS = 120;
const FULL_RANGE_RATIO = 0.9;

export interface Playback {
  isPlaying: boolean;
  speed: Speed;
  toggle: () => void;
  stop: () => void;
  cycleSpeed: () => void;
}

/**
 * @param eventYears Sorted years of everything the axis is currently showing. Playback uses
 *   them to skip dead stretches; see nextYearAtOrAfter.
 */
export function useTimelinePlayback(eventYears: number[]): Playback {
  const { range, bounds, setRange } = useTime();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(DEFAULT_SPEED);

  // Read inside the animation loop without restarting it on every tick.
  const latest = useRef({ range, bounds, speed, eventYears });
  latest.current = { range, bounds, speed, eventYears };

  const stop = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback(() => setIsPlaying((prev) => !prev), []);

  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => SPEEDS[(SPEEDS.indexOf(prev) + 1) % SPEEDS.length]);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    /**
     * Pressing play is a deliberate act, so this is not the unprompted motion that
     * prefers-reduced-motion exists to suppress: silently refusing would just remove a
     * feature. It steps coarsely instead, so the change reads as a sequence of states
     * rather than as a crawl.
     */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stepMs = reduced ? REDUCED_STEP_MS : STEP_MS;

    const span = latest.current.bounds.to - latest.current.bounds.from;
    let { from, to } = latest.current.range;

    // Full range, or parked at the end: start over from the beginning of the record.
    if (to - from >= span * FULL_RANGE_RATIO || to >= latest.current.bounds.to) {
      const width = to - from >= span * FULL_RANGE_RATIO ? DEFAULT_WINDOW_YEARS : to - from;
      from = latest.current.bounds.from;
      to = from + width;
      setRange(from, to);
    }

    /**
     * The archive is not evenly populated: it opens with Troy at 1200 BC and then says
     * nothing until the Greco-Persian wars around 500 BC, while 224 of 456 events fall in
     * the twentieth century alone. Playing at a constant rate through that means the first
     * six seconds are an empty map, which reads as a broken feature rather than as a quiet
     * millennium. When the window holds nothing, jump it to the next event instead of
     * grinding across the gap.
     */
    const nextYearAtOrAfter = (year: number): number | null => {
      const years = latest.current.eventYears;
      let lo = 0;
      let hi = years.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (years[mid] < year) lo = mid + 1;
        else hi = mid;
      }
      return lo < years.length ? years[lo] : null;
    };

    const hasEventsIn = (a: number, b: number): boolean => {
      const next = nextYearAtOrAfter(a);
      return next != null && next <= b;
    };

    let frame = 0;
    let last = performance.now();
    let carried = 0;

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed >= stepMs) {
        last = now;
        // Fractional years accumulate instead of being truncated away, so slow speeds do
        // not stall on integer rounding.
        carried += (latest.current.speed * elapsed) / 1000;
        const advance = Math.floor(carried);

        if (advance > 0) {
          carried -= advance;
          const width = latest.current.range.to - latest.current.range.from;
          const end = latest.current.bounds.to;
          let nextTo = Math.min(latest.current.range.to + advance, end);

          if (!hasEventsIn(nextTo - width, nextTo)) {
            const jump = nextYearAtOrAfter(nextTo - width);
            // Land the next event a fifth of the way in, so it arrives rather than
            // appearing already at the edge.
            if (jump != null) nextTo = Math.min(jump + Math.round(width * 0.8), end);
          }

          setRange(nextTo - width, nextTo);

          if (nextTo >= end) {
            setIsPlaying(false);
            return;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `range` is read through the ref; depending on it here would restart the loop each tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, setRange]);

  return { isPlaying, speed, toggle, stop, cycleSpeed };
}
