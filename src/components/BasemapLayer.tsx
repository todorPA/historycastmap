import { useEffect, useState } from 'react';
import { TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { canvas, polygon, polyline, type Layer } from 'leaflet';
import type { Basemap } from '../config/basemaps';
import { useTime } from '../state/TimeContext';
import { yearToOhmDate } from '../lib/time';
import { useDebounced } from '../lib/useDebounced';
import { closeupOpacity, decodeLine, isVectorGeometry, type VectorGeometry } from '../lib/vectorBasemap';

type VectorBasemapConfig = Extract<Basemap, { kind: 'vector' }>;

/** Below Leaflet's tile pane (200), so the close-up tiles fade in over the paper sheet. */
const VECTOR_PANE = 'hc-vector-basemap';

/** One request per page, however often the layer remounts. */
const geometryCache = new Map<string, Promise<VectorGeometry>>();

function loadGeometry(path: string): Promise<VectorGeometry> {
  const url = `${import.meta.env.BASE_URL}${path}`;
  let p = geometryCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${url}`))))
      .then((g: unknown) => (isVectorGeometry(g) ? g : Promise.reject(new Error(`not basemap geometry: ${url}`))));
    // A failed load must not stick: the next mount tries again.
    p.catch(() => geometryCache.delete(url));
    geometryCache.set(url, p);
  }
  return p;
}

/**
 * The paper map: Natural Earth geometry on one canvas, in the theme's map colours. Canvas cannot
 * read CSS variables, so the colours are read once from the map container — theme.css stays the
 * only place they are defined.
 */
function VectorBasemap({ basemap }: { basemap: VectorBasemapConfig }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  useEffect(() => {
    if (!map.getPane(VECTOR_PANE)) map.createPane(VECTOR_PANE).style.zIndex = '150';
    const css = getComputedStyle(map.getContainer());
    const colour = (name: string) => css.getPropertyValue(name).trim();
    const renderer = canvas({ pane: VECTOR_PANE, padding: 0.4 });
    let layers: Layer[] = [];
    let live = true;

    loadGeometry(basemap.path)
      .then((g) => {
        if (!live) return;
        const rings = (rs: number[][]) => rs.map((r) => [decodeLine(r)]);
        const common = { renderer, pane: VECTOR_PANE, interactive: false } as const;
        layers = [
          // The credit rides on the land layer, so it leaves with the basemap.
          polygon(rings(g.land), { ...common, stroke: false, fillColor: colour('--map-land'), fillOpacity: 1, attribution: basemap.attribution }),
          polygon(rings(g.lakes), { ...common, stroke: false, fillColor: colour('--map-water'), fillOpacity: 1 }),
          polyline(g.rivers.map(decodeLine), { ...common, color: colour('--map-river'), weight: 0.9 }),
          polygon(rings(g.borders), { ...common, fill: false, color: colour('--map-border'), weight: 0.8 }),
        ];
        for (const l of layers) l.addTo(map);
      })
      .catch((err) => console.warn('basemap geometry did not load; the map shows water only:', err));

    return () => {
      live = false;
      for (const l of layers) l.remove();
    };
  }, [map, basemap.path, basemap.attribution]);

  const { closeup } = basemap;
  const opacity = closeupOpacity(zoom, closeup.fade);
  // Not mounted while invisible: no tile requests, and no OSM credit, at the zooms that show
  // only Natural Earth.
  if (opacity === 0) return null;
  return (
    <TileLayer
      url={closeup.url}
      attribution={closeup.attribution}
      opacity={opacity}
      maxNativeZoom={closeup.maxNativeZoom}
      maxZoom={basemap.maxZoom}
    />
  );
}

/** Scrubbing the timeline must not fire a tile request per frame (SPEC-ohm.md §Performance). */
const DATE_DEBOUNCE_MS = 300;

/**
 * The only component that knows tile URLs exist. MapView passes a basemap config and this
 * resolves it — including injecting the current year for time-aware (OHM) layers.
 */
export default function BasemapLayer({ basemap }: { basemap: Basemap }) {
  const { focusYear } = useTime();
  const debouncedYear = useDebounced(focusYear, DATE_DEBOUNCE_MS);

  if (basemap.kind === 'vector') return <VectorBasemap key={basemap.id} basemap={basemap} />;

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
