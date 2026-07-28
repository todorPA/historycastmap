import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { CircleMarker as CircleMarkerType, LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import type { HistoryEvent } from '../types/events';
import { getBasemap } from '../config/basemaps';
import { useData, useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { t } from '../lib/i18n';
import BasemapLayer from './BasemapLayer';
import EventPopup from './EventPopup';
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

interface Positioned {
  event: HistoryEvent;
  position: LatLngTuple;
  color: string;
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
  const { lang, basemapId, selectedEventId, setSelectedEventId, activeEpisodeId, timelineSize } =
    useFilters();
  const basemap = getBasemap(basemapId);
  const markerRefs = useRef(new Map<string, CircleMarkerType>());

  const positioned = useMemo<Positioned[]>(() => {
    const seenAtPlace = new Map<string, number>();
    const out: Positioned[] = [];
    for (const event of visible) {
      const place = placesById[event.placeId];
      if (!place) continue; // unknown placeId: skip rather than render at 0,0
      const index = seenAtPlace.get(event.placeId) ?? 0;
      seenAtPlace.set(event.placeId, index + 1);
      const [dLat, dLng] = offsetFor(index);
      out.push({
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

  // Selection can come from the timeline as well — open that marker's popup.
  useEffect(() => {
    if (!selectedEventId) return;
    markerRefs.current.get(selectedEventId)?.openPopup();
  }, [selectedEventId, positioned]);

  return (
    <div className="map-wrap">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="map"
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

        {positioned.map(({ event, position, color }) => {
          const low = event.confidence === 'low';
          const selected = event.id === selectedEventId;
          return (
            <CircleMarker
              key={event.id}
              center={position}
              radius={selected ? 11 : 8}
              ref={(instance) => {
                if (instance) markerRefs.current.set(event.id, instance);
                else markerRefs.current.delete(event.id);
              }}
              pathOptions={{
                color: selected ? '#ffffff' : color,
                weight: selected ? 3 : low ? 2 : 1.5,
                dashArray: low ? '3 3' : undefined,
                fillColor: color,
                fillOpacity: low ? 0.6 : 0.95,
                opacity: low ? 0.6 : 1,
              }}
              eventHandlers={{
                click: () => setSelectedEventId(event.id),
              }}
            >
              <Popup minWidth={280} maxWidth={340}>
                <EventPopup event={event} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <Legend />
      {positioned.length === 0 && <div className="map-empty">{t(lang, 'noEvents')}</div>}
    </div>
  );
}
