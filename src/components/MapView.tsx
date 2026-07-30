import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import { getBasemap } from '../config/basemaps';
import { useData, useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { t } from '../lib/i18n';
import BasemapLayer from './BasemapLayer';
import BasemapSwitcher from './BasemapSwitcher';
import EventMarkers from './EventMarkers';
import type { PositionedEvent } from './EventMarkers';
import Legend from './Legend';

const DEFAULT_CENTER: LatLngTuple = [43.5, 20.5];
const DEFAULT_ZOOM = 5;

/** Events sharing a place get a tiny spiral offset so they stay individually clickable. */
function offsetFor(index: number): [number, number] {
  if (index === 0) return [0, 0];
  const step = 0.18;
  const angle = (index * 2.39996) % (Math.PI * 2); // golden-angle spread
  const radius = step * Math.sqrt(index);
  return [radius * Math.sin(angle), radius * Math.cos(angle)];
}

/**
 * Fits the view when the *set of events being looked at* changes — i.e. on load and on
 * episode change. Deliberately NOT on every range change: re-fitting mid-scrub yanks the
 * map around under the cursor, which makes the timeline feel broken.
 */
function FitToMarkers({ points, fitKey }: { points: LatLngTuple[]; fitKey: string }) {
  const map = useMap();
  const latest = useRef(points);
  latest.current = points;

  useEffect(() => {
    const pts = latest.current;
    if (pts.length === 0) return;
    // Let a container resize settle first, so fitBounds measures the final viewport.
    const id = window.setTimeout(() => {
      // Fitting against a zero-sized container yields a nonsense zoom, and Leaflet then
      // throws "Attempted to load an infinite number of tiles" and renders no basemap at
      // all. The timeline sizes itself to its content, so the map can briefly measure flat.
      const size = map.getSize();
      if (size.x < 50 || size.y < 50) return;

      if (pts.length === 1) {
        map.setView(pts[0], 7);
        return;
      }
      map.fitBounds(pts as LatLngBoundsExpression, { padding: [48, 48], maxZoom: 8 });
    }, 210);
    return () => window.clearTimeout(id);
  }, [fitKey, map]);

  return null;
}

/**
 * Raising the timeline shrinks the map's container. Leaflet doesn't observe that, so tell
 * it the size changed — otherwise tiles and marker positions stay stale.
 */
function InvalidateOnResize({ resizeKey }: { resizeKey: string }) {
  const map = useMap();

  useEffect(() => {
    // Wait for the CSS height transition (160ms) to settle before measuring.
    const id = window.setTimeout(() => map.invalidateSize(), 200);
    return () => window.clearTimeout(id);
  }, [resizeKey, map]);

  return null;
}

/** Pans to the selected event and opens its popup (used by timeline clicks too). */
function PanToSelected({ points }: { points: Map<string, LatLngTuple> }) {
  const map = useMap();
  const { selectedEventId } = useFilters();

  useEffect(() => {
    if (!selectedEventId) return;
    const target = points.get(selectedEventId);
    if (target) map.panTo(target, { animate: true });
  }, [selectedEventId, points, map]);

  return null;
}

export default function MapView() {
  const { placesById, episodesById, data } = useData();
  const visible = useVisibleEvents();
  const { lang, basemapId, activeEpisodeId, timelineSize } = useFilters();
  const basemap = getBasemap(basemapId);

  const positioned = useMemo<PositionedEvent[]>(() => {
    const seenAtPlace = new Map<string, number>();
    const out: PositionedEvent[] = [];
    for (const event of visible) {
      const place = placesById[event.placeId];
      if (!place) continue; // unknown placeId: skip rather than render at 0,0
      const index = seenAtPlace.get(event.placeId) ?? 0;
      seenAtPlace.set(event.placeId, index + 1);
      const [dLat, dLng] = offsetFor(index);
      out.push({
        id: event.id,
        event,
        position: [place.lat + dLat, place.lng + dLng],
        color: episodesById[event.episodeId]?.color ?? '#7f8c8d',
      });
    }
    return out;
  }, [visible, placesById, episodesById]);

  const points = useMemo(() => positioned.map((p) => p.position), [positioned]);
  const pointsById = useMemo(
    () => new Map(positioned.map((p) => [p.event.id, p.position])),
    [positioned],
  );

  return (
    <div className="map-wrap">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="map"
        minZoom={2}
        worldCopyJump
        scrollWheelZoom
      >
        <BasemapLayer basemap={basemap} />
        <InvalidateOnResize resizeKey={timelineSize} />
        <FitToMarkers
          points={points}
          fitKey={`${data.meta.generated}|${activeEpisodeId ?? 'all'}|${timelineSize}`}
        />
        <PanToSelected points={pointsById} />

        <EventMarkers items={positioned} />
      </MapContainer>

      <Legend />
      <BasemapSwitcher />
      {positioned.length === 0 && <div className="map-empty">{t(lang, 'noEvents')}</div>}
    </div>
  );
}
