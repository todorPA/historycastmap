# SPEC — Prototype (Phase 1)

Detailed build spec for Claude Code. Goal: a working, deployable prototype using `geo-events.sample.json` (2 episodes). Vanilla data, React + TS + Vite.

## 0. Setup

```bash
npm create vite@latest . -- --template react-ts
npm i leaflet react-leaflet vis-timeline
npm i -D @types/leaflet
```

- Node 18+. Base path for GitHub Pages: set `base: '/historycastmap/'` in `vite.config.ts`.
- Copy `geo-events.sample.json` → `public/data/geo-events.sample.json`.
- Copy `geo-events.schema.json` to repo root (for reference/validation).

## 1. Data loading

- On app start, fetch `import.meta.env.BASE_URL + 'data/geo-events.sample.json'`.
- Parse into typed `GeoData` (see `src/types/events.ts`, mirror the schema).
- Build lookup maps: `placesById`, `episodesById`.

## 2. Layout

```
┌───────────┬───────────────────────────────┐
│           │                               │
│ Sidebar   │        MapView (Leaflet)      │
│ (episodes │                               │
│  + lang)  │                               │
│           ├───────────────────────────────┤
│           │     TimelineView (vis)        │
└───────────┴───────────────────────────────┘
```

- Responsive: on narrow screens, sidebar collapses to a top drawer.

## 3. State (React Context)

**TimeContext**
- `range: { from: number; to: number }` in years (BC negative). Default = [min event year, max event year].
- `setRange(from, to)`.

**FilterContext**
- `activeEpisodeId: string | null` (null = all episodes).
- `lang: 'sr' | 'en'` (default 'sr').
- `selectedEventId: string | null`.

An event is **visible** iff:
`(activeEpisodeId == null || e.episodeId === activeEpisodeId) && e.year >= range.from && e.year <= range.to`.

## 4. MapView (Leaflet)

- Base tile layer (Phase 1, modern): OSM standard
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (attribution required).
- **Basemap is rendered via a `<BasemapLayer />` child** so Phase 2 can swap it (see SPEC-ohm). Do NOT hardcode the tile URL inside MapView logic — read it from a `basemap` config object.
- Render a marker per **visible** event at its place's lat/lng.
- Marker color = episode color (`episodes[].color`). Low-confidence events: 60% opacity + dashed ring.
- If multiple events share a place, offset slightly or (Phase 3) cluster.
- Click marker → set `selectedEventId` → open `EventPopup`.
- Initial view: fit bounds to visible markers.

## 5. TimelineView (vis-timeline)

- One timeline item per event (use `year` as start; if `yearEnd`, render as a range).
- Group by `region` (optional, nice-to-have).
- Selecting/scrubbing the visible window updates `TimeContext.range` (debounce 150ms).
- Clicking a timeline item → `selectedEventId` + pan map to that marker.
- BC years: vis-timeline uses JS Dates. Use a helper `yearToDate(year)` that maps integer year → `new Date(year, 0, 1)` (JS Date supports year 0 and negatives via `setFullYear`). Keep all filtering in integer-year space, use Dates only for vis rendering.

## 6. Sidebar

- Header: app title + `LangToggle`.
- Episode list: each row shows color swatch + episode title (in current lang, fallback sr). Click → set `activeEpisodeId` (toggle off if clicking active). "All / Sve" button clears filter.
- Small stats: number of visible events.

## 7. EventPopup / detail

Shows for `selectedEventId`:
- Title (current lang), year (formatted: `1346` or `431. p.n.e.` / `431 BC`).
- Place name, region, actors (chips).
- Description (current lang).
- `quote` in italics (provenance).
- **"▶ Play at MM:SS" button** → uses `lib/podcast.ts buildPodcastLink(audioUrl, timestamp)`.
  - Behavior: open the mp3 URL with a fragment/time param so the browser audio seeks. Implement as: convert MM:SS → seconds, open `audioUrl#t=<seconds>` in a new tab. (Most browsers honor `#t=` on media.) Provide a fallback inline `<audio controls src=... />` that we `currentTime = seconds` on play.
- confidence badge (high/med/low).

## 8. i18n (lib/i18n.ts)

- Simple dict: `{ en: {...}, sr: {...} }` for UI labels (buttons, headings).
- Event/place/episode content comes from data (`.sr` / `.en`, fallback to `.sr`).
- `LangToggle` flips `FilterContext.lang`.

## 9. Time formatting (lib/time.ts)

- `formatYear(year, lang)`: `year < 0` → `${-year}. p.n.e.` (sr) / `${-year} BC` (en); else `${year}` (+ `. godine` optional in sr).
- `yearToDate`, `dateToYear` for vis-timeline.

## 10. Podcast deep link (lib/podcast.ts)

```ts
export function timestampToSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);      // "66:38" -> [66,38]
  return parts.length === 2 ? parts[0]*60 + parts[1]
       : parts[0]*3600 + parts[1]*60 + parts[2];
}
export function buildPodcastLink(audioUrl: string, ts: string): string {
  return `${audioUrl}#t=${timestampToSeconds(ts)}`;
}
```

## 11. Styling

- Clean, map-first. Dark sidebar, light map. System font stack.
- Marker legend (episode colors) bottom-left of map.

## 12. Deploy (GitHub Pages)

- `vite.config.ts`: `base: '/historycastmap/'`.
- Add `gh-pages` dev dep + script, OR GitHub Actions workflow building `dist/` to `gh-pages` branch.
- Verify the live URL loads sample data (paths must respect `BASE_URL`).

## 13. Definition of done

Matches PLAN.md §8 acceptance criteria. Commit as `todorPA <todmilan@yahoo.com>`, push to `main`, deploy, share URL.
