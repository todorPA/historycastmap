import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { CircleMarker as CircleMarkerType, LatLngBoundsExpression } from 'leaflet';
import type { HistoryEvent } from '../types/events';
import { useFilters } from '../state/FilterContext';
import { clusterByPixel, clusterRadius } from '../lib/cluster';
import type { Clusterable } from '../lib/cluster';
import EventPopup from './EventPopup';

export interface PositionedEvent extends Clusterable {
  event: HistoryEvent;
}

/**
 * Renders one marker per cluster. Single events keep the plain circle; groups get a badge
 * with the count, and clicking one zooms to its members instead of opening a popup.
 */
export default function EventMarkers({ items }: { items: PositionedEvent[] }) {
  const map = useMap();
  const { selectedEventId, setSelectedEventId } = useFilters();
  const markerRefs = useRef(new Map<string, CircleMarkerType>());

  // Clusters depend on zoom, so re-run whenever it changes.
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters = useMemo(
    () => clusterByPixel(map, items),
    // `zoom` isn't read here directly — it's what makes the projection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, items, zoom],
  );

  // A selected event may sit inside a cluster; only open the popup when it's on its own.
  useEffect(() => {
    if (!selectedEventId) return;
    markerRefs.current.get(selectedEventId)?.openPopup();
  }, [selectedEventId, clusters]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.items.length === 1) {
          const { event, position, color } = cluster.items[0];
          const low = event.confidence === 'low';
          const selected = event.id === selectedEventId;
          return (
            <CircleMarker
              key={cluster.key}
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
              eventHandlers={{ click: () => setSelectedEventId(event.id) }}
            >
              <Popup minWidth={280} maxWidth={340}>
                <EventPopup event={event} />
              </Popup>
            </CircleMarker>
          );
        }

        const count = cluster.items.length;

        return (
          <CircleMarker
            key={cluster.key}
            center={cluster.position}
            radius={clusterRadius(count)}
            className="cluster"
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: cluster.color,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: () => {
                const bounds = cluster.items.map((i) => i.position) as LatLngBoundsExpression;
                // Zooming to the members is what splits the cluster apart.
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
              },
            }}
          >
            {/* One tooltip per layer in Leaflet, so the count label doubles as the hover
                target: keep it to the number and let the click do the explaining. */}
            <Tooltip permanent direction="center" className="cluster__label">
              {count}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
