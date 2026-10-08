import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from '../../lib/timelineAxis';
import { easeInOutCubic } from '../../lib/timelineWindow';
import { prefersReducedMotion } from '../../lib/motion';
import { useTime } from '../../state/TimeContext';

/**
 * The timeline's view, in float years, kept in step with TimeContext.
 *
 * TimeContext stays the one source of time, in integer years (PLAN §7). Dragging an 8-year window
 * across 1000 px, or tweening it, needs sub-year positions to move smoothly, so the timeline keeps
 * the float here and writes the rounded value through `setRange` on every frame — the map, list and
 * counts follow live (§12.2). A range set from elsewhere (legend, URL, playback) replaces the
 * float, unless it is just this view rounded.
 */
export function useTimelineView() {
  const { range, bounds, setRange } = useTime();
  const [view, setViewState] = useState<View>(range);
  const viewRef = useRef(view);
  const frame = useRef(0);

  const commit = useCallback(
    (v: View) => {
      viewRef.current = v;
      setViewState(v);
      setRange(v.from, v.to);
    },
    [setRange],
  );

  const cancel = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  useEffect(() => {
    const v = viewRef.current;
    if (Math.round(v.from) === range.from && Math.round(v.to) === range.to) return;
    cancel();
    viewRef.current = range;
    setViewState(range);
  }, [range, cancel]);

  /** Tween to `target` (easeInOutCubic); instant under reduced motion. */
  const tweenTo = useCallback(
    (target: View, ms: number) => {
      cancel();
      if (prefersReducedMotion() || ms <= 0) {
        commit(target);
        return;
      }
      const start = viewRef.current;
      const t0 = performance.now();
      const step = (now: number) => {
        const k = easeInOutCubic(Math.min(1, (now - t0) / ms));
        commit({ from: start.from + (target.from - start.from) * k, to: start.to + (target.to - start.to) * k });
        frame.current = k < 1 ? requestAnimationFrame(step) : 0;
      };
      frame.current = requestAnimationFrame(step);
    },
    [cancel, commit],
  );

  useEffect(() => cancel, [cancel]);

  return { view, viewRef, bounds, commit, tweenTo, cancel };
}
