import { useMemo, useState } from 'react';
import { Polyline, useMap, useMapEvents } from 'react-leaflet';

/**
 * Meridians and parallels over the basemap.
 *
 * This exists because the basemap goes silent in places: Greenland's ice sheet and the open
 * ocean carry almost no OSM features, so at close zoom the map became an empty field and you
 * could not tell you were looking at a map at all — which is what broke when a cluster's
 * fitBounds dropped you onto Grenland. A graticule answers that without adding any colour:
 * even over blank ice you read projection, scale and position.
 *
 * It is also the vernacular of the thing this project is — a historical atlas — rather than a
 * device borrowed from somewhere else, and it carries information (position) rather than
 * decorating. Hairline ink at 7%, no labels: it must never compete with the region hues,
 * which are the only meaningful colour on the surface (config/regions.ts).
 */

/**
 * Degree steps, coarse to fine. A graticule that subdivides continuously turns into a mesh,
 * so the ladder is deliberately sparse and stays on round coordinates.
 */
const STEPS = [30, 15, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];

/**
 * Chosen from the visible span rather than from the zoom level, so the grid holds roughly
 * four to eight divisions at *every* scale.
 *
 * A zoom→spacing table looked simpler and was wrong in the one case that matters: it bottomed
 * out at 0.5°, so past about z12 the span was smaller than the step and the graticule thinned
 * to a single line or vanished. That is exactly where the basemap has nothing to draw and the
 * grid is the only thing telling you this is a map.
 */
function spacingFor(span: number): number {
  const target = span / 5;
  for (const step of STEPS) if (step <= target) return step;
  return STEPS[STEPS.length - 1];
}

/** Lowest multiple of `step` at or below `value`. */
function floorTo(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

export default function Graticule() {
  const map = useMap();
  const [version, setVersion] = useState(0);
  // Redrawn on move as well as zoom: the lines are only generated for the visible extent, so
  // panning has to extend them.
  useMapEvents({
    zoomend: () => setVersion((v) => v + 1),
    moveend: () => setVersion((v) => v + 1),
  });

  const lines = useMemo(() => {
    const bounds = map.getBounds().pad(0.25);
    const south = Math.max(-85, bounds.getSouth());
    const north = Math.min(85, bounds.getNorth());
    const west = bounds.getWest();
    const east = bounds.getEast();
    // Driven by the larger axis, so one grid spacing serves both directions.
    const step = spacingFor(Math.max(east - west, north - south));

    /**
     * Capped at a sane count. Without this, a wide extent at close zoom asks for thousands of
     * polylines and the pan stutters; the cap degrades the spacing instead of the frame rate.
     */
    const MAX = 80;
    const out: [number, number][][] = [];

    for (let lng = floorTo(west, step); lng <= east && out.length < MAX; lng += step) {
      out.push([
        [south, lng],
        [north, lng],
      ]);
    }
    for (let lat = floorTo(south, step); lat <= north && out.length < MAX * 2; lat += step) {
      // Drawn in segments rather than one span, so the line follows the projection's curve
      // instead of cutting a straight chord across a wide view.
      const segments: [number, number][] = [];
      const stepLng = Math.max(step, (east - west) / 12);
      for (let lng = west; lng <= east + stepLng; lng += stepLng) segments.push([lat, lng]);
      out.push(segments);
    }
    return out;
    // `version` is what makes this recompute; the map object itself never changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, version]);

  return (
    <>
      {lines.map((positions, i) => (
        <Polyline
          key={i}
          positions={positions}
          // Non-interactive: the graticule must never swallow a click meant for a marker or
          // for the map's own deselect handler.
          interactive={false}
          pathOptions={{
            color: '#1a1713',
            opacity: 0.07,
            weight: 1,
          }}
        />
      ))}
    </>
  );
}
