import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import { getBasemap } from '../config/basemaps';
import { t } from '../lib/i18n';
import { activeFilterCount } from '../lib/episodeFilters';
import { flyTarget } from '../lib/camera';
import { neighbours } from '../lib/episodeCard';
import { prefersReducedMotion } from '../lib/motion';
import { useDebounced } from '../lib/useDebounced';
import { useData, useMatchingEpisodes } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import BasemapLayer from './BasemapLayer';
import EpisodeLayer from './map/EpisodeLayer';
import MapControls from './map/MapControls';
import EraLegend from './map/EraLegend';
import EpisodeCard from './card/EpisodeCard';

const DEFAULT_CENTER: LatLngTuple = [43.5, 20.5];
const DEFAULT_ZOOM = 5;

/** How long typing must pause before the search re-frames the map. */
const SEARCH_REFIT_MS = 400;
/** HANDOFF §10.1, §18. */
const FLY_SECONDS = 0.85;

/**
 * Fits the view when the set of episodes being looked at changes — load, filters, a settled
 * search, the timeline's height, *Prikaži sve*. Not on a range change (re-fitting mid-scrub
 * yanks the map around under the cursor) and not on selection, which flies instead.
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
      if (pts.length === 1) map.setView(pts[0], 6);
      else map.fitBounds(pts as LatLngBoundsExpression, { padding: [48, 48], maxZoom: 7 });
    }, 210);
    return () => window.clearTimeout(id);
  }, [fitKey, map]);

  return null;
}

/**
 * Leaflet does not observe its container, and the map's box changes whenever the timeline does
 * — S/M/L, and S growing with its content. Without invalidateSize, tiles and marker positions
 * stay stale. Told on every container resize, not on a guess at when that happens.
 */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/**
 * Selecting an episode flies to it (HANDOFF §10.1), offset so it lands clear of the card.
 * Waits past FitToMarkers' settle delay, so a shared link that names an episode fits first and
 * then flies, instead of the fit landing on top of the flight.
 */
function FlyToSelection({ target, selectionId }: { target: LatLngTuple | null; selectionId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const id = window.setTimeout(() => {
      const { center, zoom } = flyTarget([target[0], target[1]], { zoom: map.getZoom(), mapWidthPx: map.getSize().x, cardOpen: true });
      if (prefersReducedMotion()) map.setView(center, zoom, { animate: false });
      else map.flyTo(center, zoom, { duration: FLY_SECONDS });
    }, 260);
    return () => window.clearTimeout(id);
    // Re-fly when the selection changes — even to another episode at the same place (97 of 178
    // share their spot with another) — or its position moves; not when the array identity does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionId, target?.[0], target?.[1], map]);
  return null;
}

/** True while the user is typing somewhere, so a global shortcut must not fire. */
/** Focus is somewhere that uses the arrow keys itself: a text field, or the timeline's Window. */
function ownsArrowKeys(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return (
    !!el &&
    (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.getAttribute('role') === 'slider')
  );
}

export default function MapView() {
  const { placesById, data } = useData();
  const matching = useMatchingEpisodes();
  const { lang, basemapId, filters, query, setQuery, clearFilters, selectedEpisodeId, selectEpisode, timelineSize } = useFilters();
  const basemap = getBasemap(basemapId);
  // The search re-frames the map once typing pauses: in the fit key raw, the map jumped on every
  // keystroke; left out, a search could replace every marker with ones entirely off-screen.
  const settledQuery = useDebounced(query.trim(), SEARCH_REFIT_MS);
  const [showAll, setShowAll] = useState(0);

  const positionOf = (id: string | null): LatLngTuple | null => {
    const ep = id ? matching.find((e) => e.id === id) : undefined;
    const p = ep && placesById[ep.placeId];
    return p ? [p.lat, p.lng] : null;
  };
  const points = useMemo(
    () => matching.flatMap((ep) => (placesById[ep.placeId] ? [[placesById[ep.placeId].lat, placesById[ep.placeId].lng] as LatLngTuple] : [])),
    [matching, placesById],
  );
  const selected = matching.find((e) => e.id === selectedEpisodeId) ?? null;
  const clusterListOpen = useRef(false);

  /**
   * Esc closes the card and deselects; ←/→ step to the previous or next episode (§10.1). Caught
   * in the capture phase so Leaflet's own arrow-key panning does not also move the map — but only
   * while something is selected: with nothing selected, the arrows pan the map as before.
   */
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (ownsArrowKeys(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') {
        // An open cluster list takes Esc first; EpisodeLayer closes it.
        if (clusterListOpen.current) return;
        selectEpisode(null);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const { prev, next } = neighbours(selected, matching);
        const to = e.key === 'ArrowLeft' ? prev : next;
        e.preventDefault();
        e.stopPropagation();
        if (to) selectEpisode(to.id);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selected, matching, selectEpisode]);

  const narrowed = activeFilterCount(filters) > 0 || query.trim() !== '';

  return (
    <div className={`map-wrap${selected ? ' has-card' : ''}`}>
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="map" minZoom={2} maxZoom={basemap.maxZoom} zoomControl={false} worldCopyJump scrollWheelZoom>
        <BasemapLayer basemap={basemap} />
        <InvalidateOnResize />
        <FitToMarkers points={points} fitKey={`${data.meta.generated}|${JSON.stringify(filters)}|${settledQuery}|${timelineSize}|${showAll}`} />
        <FlyToSelection target={positionOf(selectedEpisodeId)} selectionId={selectedEpisodeId} />
        <EpisodeLayer episodes={matching} listOpenRef={clusterListOpen} />
        <MapControls onShowAll={() => setShowAll((n) => n + 1)} />
      </MapContainer>

      <EraLegend />
      {selected && <EpisodeCard episode={selected} />}

      {/* Name the cause and offer the way out (HANDOFF §6.5). */}
      {matching.length === 0 && (
        <div className="map-empty">
          {t(lang, narrowed ? 'emptyFilters' : 'noEvents')}{' '}
          {narrowed && (
            <button type="button" className="hc-link" onClick={() => { clearFilters(); setQuery(''); }}>
              {t(lang, 'clearAll')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
