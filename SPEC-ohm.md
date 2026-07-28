# SPEC — OpenHistoricalMap basemap (Phase 2)

How to add time-aware historical borders **without refactoring** the prototype. Read PLAN.md §7 first — the prototype is built so this drops in cleanly.

## Goal

When the user scrubs the timeline to year Y, the map's *basemap* shows historical borders/features valid in year Y (in addition to our event markers on top).

## Source: OpenHistoricalMap (OHM)

OHM is an OSM-style project with a **date dimension**. Two ways to consume it:

### Option A — Raster tiles with date filter (simplest, recommended first)
OHM serves time-filtered raster tiles. Base pattern:
```
https://{s}.tiles.openhistoricalmap.org/hot/{z}/{x}/{y}.png?date={YYYY-MM-DD}
```
(Confirm the current endpoint at wiki.openhistoricalmap.org — the tile host/params occasionally change. If the date-param raster is unavailable, use Option B.)

- Simple `L.tileLayer` swap; just re-set the `date` param when the year changes.
- Downside: coverage is uneven across regions/eras (OHM is community-built). Some years/areas will look sparse. That's acceptable — our markers carry the real content.

### Option B — Vector tiles + MapLibre filter (richer, more work)
OHM publishes vector tiles; MapLibre GL can filter features by `start_date`/`end_date`. This gives smooth styling but adds MapLibre alongside Leaflet. Defer unless Option A proves too limited.

## Integration points (already stubbed in prototype)

1. **`BasemapSwitcher.tsx`** — toggles a `basemap` config:
   ```ts
   type Basemap =
     | { kind: 'modern'; url: string; attribution: string }
     | { kind: 'ohm'; urlTemplate: string; attribution: string }; // urlTemplate contains {date}
   ```
2. **`MapView`** reads `basemap` + `TimeContext`. When `basemap.kind === 'ohm'`, it builds the tile URL by injecting the date derived from the **current year** (use `to` of the range, or a single "focus year").
3. **Date derivation** (`lib/time.ts`): `yearToOhmDate(year) => \`${pad(year)}-01-01\``. Handle BC/AD; OHM supports historical dates but confirm negative-year formatting.
4. **Re-render on year change**: when the OHM basemap is active, changing the year updates the tile layer's URL (remove old layer, add new — or use a keyed React component so react-leaflet remounts the `TileLayer`).

## Performance
- Debounce year→tile updates (e.g. 300ms) so scrubbing doesn't hammer the tile server.
- Cache last N date-tiles in browser (default HTTP cache is usually fine).

## Acceptance (Phase 2)
- [ ] Basemap switcher toggles Modern ↔ Historical.
- [ ] With Historical active, scrubbing the timeline visibly changes borders (where OHM has data).
- [ ] Event markers stay correct and on top regardless of basemap.
- [ ] No changes needed to the event data model (proves §7 design held).

## Notes / gotchas
- OHM attribution is required — include it in the layer attribution.
- Expect gaps; consider a small "borders from OpenHistoricalMap — coverage varies by era/region" note in the UI.
- Keep modern OSM as the default basemap; Historical is opt-in.
