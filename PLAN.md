# HistoryCast Map — Development Plan / Plan razvoja

> **EN:** Interactive map + timeline of historical events extracted from the HistoryCast podcast (181 episodes, Serbian).
> **SR:** Interaktivna mapa + vremenska osa istorijskih događaja izvučenih iz podkasta HistoryCast (181 epizoda).

---

## 1. Purpose / Svrha

Turn 181 transcribed podcast episodes into an interactive, bilingual (EN/SR) web app where a user can:
- Browse historical events on a **map** (Leaflet).
- Scrub a **timeline** (vis-timeline) to filter events by year; the map updates.
- Pick an **episode** from a sidebar to see only that episode's events ("the map of that story").
- Click an event → read details + **jump to the exact minute in the podcast** (deep link with timestamp).
- (Phase 2) See **historical borders** for the selected year via OpenHistoricalMap (OHM) tiles.

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **React + TypeScript (Vite)** | fast dev server, typed data model |
| Map | **Leaflet** + `react-leaflet` | free, no API key |
| Timeline | **vis-timeline** (`vis-timeline/standalone`) | scrub + range selection |
| Historical basemap (Phase 2) | **OpenHistoricalMap** raster/vector tiles | time-filtered borders |
| State | React Context (single `TimeState` + `FilterState`) | shared by map/timeline/sidebar |
| i18n | lightweight dict (`en` / `sr`) | no heavy lib needed |
| Data | static `public/data/geo-events.json` | no backend |
| Hosting | **GitHub Pages** | repo: github.com/todorPA/historycastmap |

## 3. Repository

- Repo: `https://github.com/todorPA/historycastmap`
- Commit author: **todorPA** `<todmilan@yahoo.com>`
- Branch: `main`

## 4. Phases

### Phase 0 — Scaffold
- Vite + React + TS project, ESLint/Prettier, folder structure (§6).
- Commit initial scaffold.

### Phase 1 — Prototype (2 episodes)
- Load `geo-events.sample.json` (Dušanova Srbija + Kosovska bitka).
- Map with event markers (color by episode/region).
- vis-timeline synced to map (year filter).
- Sidebar: episode list → filter to one episode.
- Event popup → details + "Play at MM:SS" deep link to podcast.
- Language toggle EN/SR.
- **Deploy to GitHub Pages, review visual direction with Milan.**

### Phase 2 — OHM historical basemap
- Add OHM tile layer wired to the shared "current year".
- Basemap switcher (Modern ↔ Historical).
- See `SPEC-ohm.md` (architecture designed for this from day 1 — no refactor).

### Phase 3 — Full dataset
- Milan/Enchanté delivers full geocoded `geo-events.json` (all 181 episodes).
- Performance pass: marker clustering (`leaflet.markercluster`), lazy popups.

### Phase 4 — Polish
- Routes/paths (Dušan's conquests, campaigns) as animated polylines (optional).
- Search, region filter, share-URL (encodes year + episode + selected event).

## 5. Data flow

```
transkripti/*.txt  ──(Enchanté/LLM: geocode + clean)──▶  geo-events.json
                                                              │
                                        React app loads static JSON
                                                              │
                    ┌─────────────────┬───────────────────────┐
                    ▼                 ▼                        ▼
                  Map(Leaflet)    Timeline(vis)          Sidebar(episodes)
                    └───────── shared TimeState + FilterState ─────────┘
```

## 6. Folder structure

```
historycastmap/
├── public/
│   └── data/
│       ├── geo-events.json          # full dataset (Phase 3)
│       └── geo-events.sample.json   # prototype dataset (Phase 1)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── events.ts                # TS types mirroring the schema
│   ├── state/
│   │   ├── TimeContext.tsx          # current year / range (shared)
│   │   └── FilterContext.tsx        # active episode, region, search
│   ├── components/
│   │   ├── MapView.tsx              # Leaflet map + markers
│   │   ├── TimelineView.tsx         # vis-timeline
│   │   ├── Sidebar.tsx              # episode list + filters
│   │   ├── EventPopup.tsx           # details + podcast deep link
│   │   ├── BasemapSwitcher.tsx      # Modern ↔ OHM (Phase 2)
│   │   └── LangToggle.tsx
│   ├── lib/
│   │   ├── podcast.ts               # buildPodcastLink(url, "MM:SS")
│   │   ├── time.ts                  # year<->range helpers, BC/AD
│   │   └── i18n.ts                  # en/sr dictionary
│   └── styles/
├── CLAUDE.md                        # instructions for Claude Code
├── PLAN.md                          # this file
├── SPEC-prototip.md                 # Phase 1 detailed spec
├── SPEC-ohm.md                      # Phase 2 OHM plan
├── geo-events.schema.json           # data contract
└── README.md
```

## 7. Key design rules (so OHM/full-data cause NO rework)

1. **Every event has `year` and `yearEnd`** (period, not just a point). Timeline + OHM need time ranges.
2. **Basemap is a swappable layer.** Modern and OHM are just different tile layers toggled via `BasemapSwitcher`. The map component never hardcodes a basemap.
3. **One source of truth for time.** `TimeContext` holds the current year/range. Map, timeline, and basemap all *read* from it. No duplicated year state.
4. **Place identity is normalized.** Events reference a canonical place (name + lat/lng), never a raw declension. Geocoding/normalization happens upstream (in data), not in the UI.
5. **BC/AD as negative/positive integers.** `year: -431` = 431 BC. All time math uses integers; formatting for display handles "p.n.e./BC".
6. **Confidence field** on each event (`high|medium|low`) — lets the UI de-emphasize uncertain years (Whisper sometimes drops a digit).

## 8. Acceptance criteria — Prototype (Phase 1)

- [ ] `npm run dev` starts, map renders with sample events.
- [ ] Timeline scrub filters visible markers by year range.
- [ ] Clicking an episode in the sidebar shows only its events.
- [ ] Event popup shows title/year/place/description and a working "Play at MM:SS" link.
- [ ] EN/SR toggle switches all UI labels.
- [ ] Deployed to GitHub Pages.
- [ ] Data model matches `geo-events.schema.json` (validated).
