// Basemap configuration. The map never hardcodes a tile URL — it renders whatever
// config it is given. Phase 2 (OHM) adds an 'ohm' entry here and a switcher; MapView
// and BasemapLayer need no changes beyond honoring the {date} template. See SPEC-ohm.md.

export type Basemap =
  | { id: string; kind: 'modern'; label: string; url: string; attribution: string }
  | { id: string; kind: 'ohm'; label: string; urlTemplate: string; attribution: string };

export const BASEMAPS: Basemap[] = [
  {
    id: 'osm',
    kind: 'modern',
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
];

export const DEFAULT_BASEMAP_ID = 'osm';

export function getBasemap(id: string): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}
