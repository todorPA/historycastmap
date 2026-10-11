/**
 * The vector basemap's geometry and the close-up cross-fade, kept free of Leaflet so they can be
 * tested under Node. The drawing is in components/BasemapLayer.tsx.
 */

export const VECTOR_LAYERS = ['land', 'lakes', 'rivers', 'borders'] as const;

/** Each layer is a list of flat [lon×100, lat×100, …] integer arrays (scripts/extract-basemap.mjs). */
export type VectorGeometry = Record<(typeof VECTOR_LAYERS)[number], number[][]>;

export function isVectorGeometry(v: unknown): v is VectorGeometry {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return VECTOR_LAYERS.every(
    (k) => Array.isArray(o[k]) && (o[k] as unknown[]).every((r) => Array.isArray(r) && r.length % 2 === 0),
  );
}

/** One ring or line, in the [lat, lng] order Leaflet takes. */
export function decodeLine(flat: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < flat.length; i += 2) out.push([flat[i + 1] / 100, flat[i] / 100]);
  return out;
}

/**
 * Opacity of the close-up tiles at a zoom: none until `from`, all from `to`, linear between.
 * 1:50m coastlines turn visibly angular past zoom 7, so street-level detail fades in there.
 */
export function closeupOpacity(zoom: number, fade: { from: number; to: number }): number {
  if (zoom <= fade.from) return 0;
  if (zoom >= fade.to) return 1;
  return (zoom - fade.from) / (fade.to - fade.from);
}
