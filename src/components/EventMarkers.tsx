import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { CircleMarker as CircleMarkerType, LatLngBoundsExpression } from 'leaflet';
import type { HistoryEvent } from '../types/events';
import { useFilters } from '../state/FilterContext';
import { clusterByPixel, clusterRadius } from '../lib/cluster';
import type { Clusterable } from '../lib/cluster';
import EventPopup from './EventPopup';
import EventGroupPopup from './EventGroupPopup';

/** One map dot: everything that happened at one place in one year (see MapView.groupEvents). */
export interface PositionedEvent extends Clusterable {
  events: HistoryEvent[];
}

/**
 * Renders one marker per cluster. A cluster of one dot shows that dot's popup — a single
 * event, or the list of events sharing its place and year. Clusters of several dots show a
 * count and zoom to their members on click, which is what breaks them apart.
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

  // Selection can come from the timeline; open the popup of whichever dot holds that event.
  useEffect(() => {
    if (!selectedEventId) return;
    markerRefs.current.get(selectedEventId)?.openPopup();
  }, [selectedEventId, clusters]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.items.length === 1) {
          const dot = cluster.items[0];
          const { events, position, color } = dot;
          const low = events.every((e) => e.confidence === 'low');
          const selected = events.some((e) => e.id === selectedEventId);
          const count = events.length;

          return (
            <CircleMarker
              key={cluster.key}
              center={position}
              radius={selected ? 11 : count > 1 ? 10 : 8}
              ref={(instance) => {
                // Registered under every member id, so a timeline selection finds this dot.
                for (const e of events) {
                  if (instance) markerRefs.current.set(e.id, instance);
                  else markerRefs.current.delete(e.id);
                }
              }}
              pathOptions={{
                // Every dot carries a dark ring, so the fill is free to be whatever the
                // region palette needs it to be and still reads on light tiles
                // (config/regions.ts). Selection takes the ring to paper-white: the chrome
                // spends no hue, so a selected marker can't be read as a region.
                color: selected ? '#f2f5f8' : 'rgba(18, 23, 29, 0.85)',
                weight: selected ? 3 : low ? 2 : 1.5,
                dashArray: low ? '3 3' : undefined,
                fillColor: color,
                fillOpacity: low ? 0.6 : 0.95,
                opacity: low ? 0.6 : 1,
              }}
              eventHandlers={{ click: () => setSelectedEventId(events[0].id) }}
            >
              <Popup minWidth={280} maxWidth={360}>
                {count === 1 ? (
                  <EventPopup event={events[0]} />
                ) : (
                  <EventGroupPopup events={events} />
                )}
              </Popup>
              {count > 1 && (
                <Tooltip permanent direction="center" className="cluster__label">
                  {count}
                </Tooltip>
              )}
            </CircleMarker>
          );
        }

        // Several dots share a screen cell: collapse to a count of the events behind them.
        const count = cluster.items.reduce((sum, dot) => sum + dot.events.length, 0);

        return (
          <CircleMarker
            key={cluster.key}
            center={cluster.position}
            radius={clusterRadius(count)}
            className="cluster"
            pathOptions={{
              color: 'rgba(18, 23, 29, 0.85)',
              weight: 2,
              fillColor: cluster.color,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: () => {
                const bounds = cluster.items.map((i) => i.position) as LatLngBoundsExpression;
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
              },
            }}
          >
            <Tooltip permanent direction="center" className="cluster__label">
              {count}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
