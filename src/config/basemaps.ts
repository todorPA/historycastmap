// Basemap configuration. The map never hardcodes a tile URL — it renders whatever
// config it is given, so adding a layer is a data change, not a code change.

export type Basemap =
  | {
      id: string;
      kind: 'modern';
      labelKey: BasemapLabelKey;
      url: string;
      attribution: string;
      noteKey?: BasemapNoteKey;
      /** Deepest zoom the server actually has tiles for; Leaflet upscales beyond it. */
      maxNativeZoom?: number;
      maxZoom?: number;
    }
  | {
      id: string;
      kind: 'ohm';
      labelKey: BasemapLabelKey;
      /** Contains {date}, replaced with the focus year (see lib/time.ts yearToOhmDate). */
      urlTemplate: string;
      attribution: string;
      noteKey?: BasemapNoteKey;
      maxNativeZoom?: number;
      maxZoom?: number;
    }
  | {
      id: string;
      kind: 'vector';
      labelKey: BasemapLabelKey;
      /** Geometry file, relative to the deploy base (lib/vectorBasemap.ts has the format). */
      path: string;
      attribution: string;
      /** Raster tiles that fade in over the vector sheet where its 1:50m detail runs out. */
      closeup: {
        url: string;
        attribution: string;
        fade: { from: number; to: number };
        maxNativeZoom?: number;
      };
      maxZoom?: number;
    };

export type BasemapLabelKey = 'basemapModern' | 'basemapHistorical';
export type BasemapNoteKey = 'ohmStaticNote';

export const BASEMAPS: Basemap[] = [
  // The design's paper map (HANDOFF §3.3): Natural Earth land, lakes, rivers and borders drawn
  // in the theme's map colours, with no labels to compete with the episode marks. Taken from
  // the prototype by scripts/extract-basemap.mjs.
  {
    id: 'paper',
    kind: 'vector',
    labelKey: 'basemapModern',
    path: 'data/basemap/ne-50m.json',
    attribution: '<a href="https://www.naturalearthdata.com/">Natural Earth</a>',
    closeup: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      fade: { from: 6.5, to: 7.5 },
    },
    maxZoom: 18,
  },
  {
    id: 'osm',
    kind: 'modern',
    labelKey: 'basemapModern',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },

  // No historical basemap for now — deliberately.
  //
  // OHM's raster tiles take no date parameter, so they cannot follow the timeline: the year
  // filtering on openhistoricalmap.org happens client-side in MapLibre over vector tiles
  // (vtiles.openhistoricalmap.org/maps/ohm/{z}/{x}/{y}.pbf). The one raster endpoint that
  // does respond (static-tiles.openhistoricalmap.org/{z}/{x}/{y}.png) is also sparse and
  // shallow — past a few zoom levels most of the world is blank. Offering it as
  // "Historical" would promise era-correct borders and deliver a grey sheet.
  //
  // Everything needed to plug in a time-aware layer is still here and unused: the 'ohm'
  // variant above, BasemapLayer's date injection with a 300 ms debounce, yearToOhmDate() in
  // lib/time.ts, focusYear on TimeContext, and basemapId in state and in the share URL.
  // Adding MapLibre (SPEC-ohm.md Option B) is what's left — see SPEC-ohm.md for findings.
];

export const DEFAULT_BASEMAP_ID = 'paper';

export function getBasemap(id: string): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}
