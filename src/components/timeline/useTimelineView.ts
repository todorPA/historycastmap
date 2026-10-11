import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from '../../lib/timelineAxis';
import { clampView, easeInOutCubic } from '../../lib/timelineWindow';
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
  /**
   * The time source only orders its two years, so a link like `?from=1000&to=1000` arrives as a
   * zero-length range, and every year → x division is then by zero. The view always holds at
   * least the Window's 8 years inside the bounds, and the normalised range is written back.
   */
  const normalise = (r: View) => clampView(r.from, r.to, bounds);
  const [view, setViewState] = useState<View>(() => normalise(range));
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
    const target = normalise(range);
    if (target.from !== range.from || target.to !== range.to) setRange(target.from, target.to);
    const v = viewRef.current;
    if (Math.round(v.from) === target.from && Math.round(v.to) === target.to) return;
    cancel();
    viewRef.current = target;
    setViewState(target);
    // `normalise` reads only `bounds`, listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, bounds, cancel, setRange]);

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
