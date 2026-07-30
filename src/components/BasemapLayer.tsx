import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import type { Basemap } from '../config/basemaps';
import { useTime } from '../state/TimeContext';
import { yearToOhmDate } from '../lib/time';

/** Scrubbing the timeline must not fire a tile request per frame (SPEC-ohm.md §Performance). */
const DATE_DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return settled;
}

/**
 * The only component that knows tile URLs exist. MapView passes a basemap config and this
 * resolves it — including injecting the current year for time-aware (OHM) layers.
 */
export default function BasemapLayer({ basemap }: { basemap: Basemap }) {
  const { focusYear } = useTime();
  const debouncedYear = useDebounced(focusYear, DATE_DEBOUNCE_MS);

  if (basemap.kind === 'ohm') {
    const date = yearToOhmDate(debouncedYear);
    const url = basemap.urlTemplate.replace('{date}', date);
    // Keyed by date so react-leaflet remounts the layer instead of mutating a live one.
    return (
      <TileLayer
        key={`ohm-${date}`}
        url={url}
        attribution={basemap.attribution}
        maxNativeZoom={basemap.maxNativeZoom}
        maxZoom={basemap.maxZoom}
      />
    );
  }

  return (
    <TileLayer
      key={basemap.id}
      url={basemap.url}
      attribution={basemap.attribution}
      maxNativeZoom={basemap.maxNativeZoom}
      maxZoom={basemap.maxZoom}
    />
  );
}
