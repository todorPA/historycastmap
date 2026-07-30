import type { Map as LeafletMap, LatLngTuple } from 'leaflet';

/**
 * Pixel-grid clustering: project each point at the current zoom, drop it in a square cell,
 * and merge whatever shares a cell. Clusters therefore break apart as you zoom in, which is
 * the behaviour people expect from a map.
 *
 * Deliberately not leaflet.markercluster: our markers are CircleMarkers coloured per
 * episode with confidence encoded in stroke and opacity, and that library wants to own
 * marker rendering. This keeps the visual language ours — which matters because the cluster
 * design is still an open question for the designer (see docs/design/DESIGN-BRIEF.md).
 */

/** Cell size in screen pixels. Roughly twice a marker's diameter, so clusters form before overlap. */
export const CELL_PX = 44;

export interface Clusterable {
  id: string;
  position: LatLngTuple;
  color: string;
}

export interface Cluster<T extends Clusterable> {
  /** Stable across renders for the same cell, so React can keep DOM nodes. */
  key: string;
  /** Centroid of the members. */
  position: LatLngTuple;
  items: T[];
  /** Most common member colour — used to tint the cluster badge. */
  color: string;
}

function dominantColor<T extends Clusterable>(items: T[]): string {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.color, (counts.get(item.color) ?? 0) + 1);
  let best = items[0].color;
  let bestCount = 0;
  for (const [color, count] of counts) {
    if (count > bestCount) {
      best = color;
      bestCount = count;
    }
  }
  return best;
}

export function clusterByPixel<T extends Clusterable>(
  map: LeafletMap,
  items: T[],
  cellPx: number = CELL_PX,
): Cluster<T>[] {
  const zoom = map.getZoom();
  const cells = new Map<string, T[]>();

  for (const item of items) {
    const point = map.project(item.position, zoom);
    const key = `${Math.floor(point.x / cellPx)}:${Math.floor(point.y / cellPx)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(item);
    else cells.set(key, [item]);
  }

  const clusters: Cluster<T>[] = [];
  for (const [key, members] of cells) {
    if (members.length === 1) {
      const [only] = members;
      clusters.push({ key: only.id, position: only.position, items: members, color: only.color });
      continue;
    }
    const lat = members.reduce((sum, m) => sum + m.position[0], 0) / members.length;
    const lng = members.reduce((sum, m) => sum + m.position[1], 0) / members.length;
    clusters.push({
      // Cell-based key, so the cluster survives re-renders at the same zoom.
      key: `c${zoom}:${key}`,
      position: [lat, lng],
      items: members,
      color: dominantColor(members),
    });
  }

  return clusters;
}

/** Marker radius grows with member count, but sub-linearly so big clusters stay usable. */
export function clusterRadius(count: number): number {
  if (count === 1) return 8;
  return Math.min(22, 11 + Math.round(Math.log2(count) * 3));
}
