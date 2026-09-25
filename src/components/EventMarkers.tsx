import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { CircleMarker as CircleMarkerType, LatLngBoundsExpression } from 'leaflet';
import type { HistoryEvent } from '../types/events';
import { useFilters } from '../state/FilterContext';
import { CELL_PX, clusterByPixel, clusterRadius } from '../lib/cluster';
import type { Clusterable } from '../lib/cluster';
import EventPopup from './EventPopup';
import EventGroupPopup from './EventGroupPopup';

/** One map dot: everything that happened at one place in one year (see MapView.groupEvents). */
export interface PositionedEvent extends Clusterable {
  events: HistoryEvent[];
  /**
   * True only when *every* event on this dot comes from the side series. A dot can carry
   * events from several episodes, and a mark that sometimes means "all of these" and
   * sometimes "some of these" tells the reader nothing.
   */
  side: boolean;
}

/** Radius of the side-series centre pip. Small enough not to read as a second dot. */
const PIP_RADIUS = 2.5;

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
    () =>
      // The selected dot is held out of clustering, so selecting an event always produces a
      // marker you can see and a popup that can open, however dense the surrounding area is.
      clusterByPixel(map, items, CELL_PX, (dot) =>
        selectedEventId != null && dot.events.some((e) => e.id === selectedEventId),
      ),
    // `zoom` isn't read here directly — it's what makes the projection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, items, zoom, selectedEventId],
  );

  /**
   * Selection can come from the timeline, the sidebar, or a shared URL; open the popup of
   * whichever dot holds that event.
   *
   * Retried across frames, and it waits for the popup rather than just the marker. On a deep
   * link (`?e=<id>`) the selection exists before the first render; react-leaflet registers
   * the marker ref first and binds the <Popup> child after, so calling openPopup() on a
   * marker that has no popup yet silently does nothing and there is no second attempt. The
   * marker being present is therefore not a sufficient condition, which is why this checks
   * getPopup() too.
   *
   * `clusters` is in the deps because a deep link's marker may not exist on the first pass,
   * but clusters are also recomputed on every zoom. An already-open popup is therefore left
   * alone: openPopup() auto-pans, and re-opening on zoomend would drag the viewport back to
   * the selection every time the user zoomed somewhere else.
   */
  useEffect(() => {
    if (!selectedEventId) return;

    let frame = 0;
    let tries = 0;
    const tryOpen = () => {
      const marker = markerRefs.current.get(selectedEventId);
      if (marker?.isPopupOpen()) return;
      if (marker?.getPopup()) {
        marker.openPopup();
        return;
      }
      // ~20 frames is a third of a second; enough for the map to settle, short enough that
      // a genuinely absent event (filtered out) stops retrying quickly.
      if (tries++ < 20) frame = requestAnimationFrame(tryOpen);
    };
    tryOpen();

    return () => cancelAnimationFrame(frame);
  }, [selectedEventId, clusters]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.items.length === 1) {
          const dot = cluster.items[0];
          const { events, position, color, side } = dot;
          const low = events.every((e) => e.confidence === 'low');
          const selected = events.some((e) => e.id === selectedEventId);
          const count = events.length;

          return (
            <Fragment key={cluster.key}>
            <CircleMarker
              center={position}
              radius={selected ? 11 : count > 1 ? 10 : 8}
              ref={(instance) => {
                // Registered under every member id, so a timeline selection finds this dot.
                if (!instance) return;
                for (const e of events) markerRefs.current.set(e.id, instance);

                /**
                 * Re-open on (re)mount, not only from the effect below.
                 *
                 * The effect keys on [selectedEventId, clusters], so it does not re-run when
                 * the same marker merely remounts. StrictMode remounts every marker once in
                 * development, which removed the layer and took the open popup with it
                 * (popupclose fires from Leaflet's onRemove), leaving the selection visible on
                 * the timeline with nothing on the map. Production was fine, which is exactly
                 * the kind of difference that makes this worth handling here: the marker
                 * itself knows when it exists.
                 */
                if (selected) {
                  requestAnimationFrame(() => {
                    if (instance.getPopup() && !instance.isPopupOpen()) instance.openPopup();
                  });
                }

                /**
                 * React 19 ref cleanup, and it has to compare identity rather than just
                 * delete by id. StrictMode mounts, unmounts and remounts; the old code
                 * deleted by id on teardown, so the first mount's cleanup ran *after* the
                 * second mount had registered and removed the live marker. Selection then
                 * either found nothing or held a marker belonging to the discarded map, and
                 * `openPopup()` opened a popup on a detached instance: no error, no popup.
                 */
                return () => {
                  for (const e of events) {
                    if (markerRefs.current.get(e.id) === instance) {
                      markerRefs.current.delete(e.id);
                    }
                  }
                };
              }}
              pathOptions={{
                // Every dot carries a dark ring, so the fill is free to be whatever the
                // region palette needs it to be and still reads on light tiles
                // (config/regions.ts). Selection thickens that ring to solid ink: the
                // paper-white ring this replaced was tuned for the old dark chrome and was
                // nearly invisible against light tiles.
                color: selected ? '#1a1713' : 'rgba(26, 23, 19, 0.85)',
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
            {/*
              Side-series marker: a centre pip, rendered as a sibling because a react-leaflet
              Path takes only a popup or tooltip as children. It comes after the dot so SVG
              paint order puts it on top, and it is non-interactive so clicks, hover and the
              popup all still belong to the dot underneath.

              Series needed a channel of its own: fill is already region, dashed ring and
              reduced opacity are low confidence, ring weight is selection, and radius is
              cluster count.
            */}
            {side && (
              <CircleMarker
                center={position}
                radius={PIP_RADIUS}
                interactive={false}
                pathOptions={{
                  stroke: false,
                  fillColor: '#1a1713',
                  fillOpacity: low ? 0.6 : 0.95,
                }}
              />
            )}
            </Fragment>
          );
        }

        // Several dots share a screen cell: collapse to a count of the events behind them.
        const count = cluster.items.reduce((sum, dot) => sum + dot.events.length, 0);

        /**
         * No side-series mark on clusters. The centre is taken by the count label, so the pip
         * would sit under the number as a smudge, and giving clusters a *different* mark for
         * the same meaning would make the legend say two things at once. Breaking the cluster
         * apart reveals the pips, which is the same bargain clusters already make with region
         * colour (they take the first dot's hue).
         */
        return (
          <CircleMarker
            key={cluster.key}
            center={cluster.position}
            radius={clusterRadius(count)}
            className="cluster"
            pathOptions={{
              color: 'rgba(26, 23, 19, 0.85)',
              weight: 2,
              fillColor: cluster.color,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: () => {
                // Breaking a cluster apart is navigating away from whatever was selected, so
                // drop the selection with it. Leaving it set kept `?e=` in the URL and — since
                // fitBounds changes the zoom, which recomputes `clusters` and re-runs the
                // re-open effect above — pulled the map straight back to the old event.
                setSelectedEventId(null);
                const bounds = cluster.items.map((i) => i.position) as LatLngBoundsExpression;
                /**
                 * maxZoom 7, not 12. At z12 over somewhere the basemap has nothing to say —
                 * Greenland's ice sheet, open ocean — breaking a cluster landed the reader on
                 * a blank field with two dots and no way to tell it was still a map. z7 keeps
                 * a coastline in frame, and a cluster that is still too dense to read can be
                 * broken again from there.
                 */
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 7 });
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
