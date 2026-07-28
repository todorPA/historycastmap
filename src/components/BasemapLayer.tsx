import { TileLayer } from 'react-leaflet';
import type { Basemap } from '../config/basemaps';
import { useTime } from '../state/TimeContext';
import { yearToOhmDate } from '../lib/time';

/**
 * The only component that knows about tile URLs. MapView passes a basemap config;
 * Phase 2 adds the 'ohm' branch's date wiring for free (SPEC-ohm.md §2).
 */
export default function BasemapLayer({ basemap }: { basemap: Basemap }) {
  const { focusYear } = useTime();

  if (basemap.kind === 'ohm') {
    const date = yearToOhmDate(focusYear);
    const url = basemap.urlTemplate.replace('{date}', date);
    // Keyed by date so react-leaflet remounts the layer when the year changes.
    return <TileLayer key={`ohm-${date}`} url={url} attribution={basemap.attribution} />;
  }

  return <TileLayer key={basemap.id} url={basemap.url} attribution={basemap.attribution} />;
}
