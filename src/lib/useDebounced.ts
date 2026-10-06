import { useEffect, useState } from 'react';

/**
 * `value`, but only once it has stopped changing for `delay` ms. For reactions that are too
 * costly or too jarring to run on every change: tile requests while the timeline scrubs
 * (BasemapLayer), re-framing the map while the reader types a search (MapView).
 */
export function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return settled;
}
