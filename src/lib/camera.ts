import type { Era } from '../config/eras';

type LatLng = [number, number];

/**
 * Web Mercator (EPSG:3857) in Leaflet's pixel space: the world is 256·2^zoom px square, origin
 * top-left. Written out here because Leaflet touches `window` when imported, so code that
 * imports it cannot run under Node — and this is the maths the tests need to hold still.
 */
export function project([lat, lng]: LatLng, zoom: number): [number, number] {
  const size = 256 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [(size * (lng + 180)) / 360, size * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI))];
}

export function unproject([x, y]: [number, number], zoom: number): LatLng {
  const size = 256 * 2 ** zoom;
  const lng = (x / size) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI;
  return [lat, lng];
}

/** Selection never flies closer than 6 or farther out than 4.5 (HANDOFF §10.1). */
const FLY_ZOOM = { min: 4.5, max: 6 };

/**
 * Where the map flies on a selection (§10.1): the current zoom clamped to 4.5–6, and — while the
 * card is open over the right of the map — a centre shifted right by min(196 px, 25% of the map
 * width), so the episode lands left of centre, clear of the card.
 */
export function flyTarget(
  latLng: LatLng,
  view: { zoom: number; mapWidthPx: number; cardOpen: boolean },
): { center: LatLng; zoom: number } {
  const zoom = Math.min(FLY_ZOOM.max, Math.max(FLY_ZOOM.min, view.zoom));
  if (!view.cardOpen) return { center: latLng, zoom };
  const [x, y] = project(latLng, zoom);
  return { center: unproject([x + Math.min(196, view.mapWidthPx * 0.25), y], zoom), zoom };
}

/** An era as a timeline window, clamped to the data's extent — for the legend's era swatches. */
export function eraWindow(era: Era, extent: { from: number; to: number }): { from: number; to: number } {
  return { from: Math.max(era.from, extent.from), to: Math.min(era.to, extent.to) };
}
