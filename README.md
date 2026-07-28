# HistoryCast Map

Interactive, bilingual (EN/SR) map + timeline of historical events extracted from the **HistoryCast** podcast (181 episodes, Serbian). Scrub the timeline, filter by episode, click an event to jump to the exact minute in the podcast.

**Interaktivna dvojezična (EN/SR) mapa + vremenska osa istorijskih događaja iz podkasta HistoryCast (181 epizoda).** Klizaj vremensku osu, filtriraj po epizodi, klikni na događaj da skočiš na tačan minut u podkastu.

---

## Local project location
```
/Users/Shared/historycastmap
```

## Repo
- GitHub: https://github.com/todorPA/historycastmap
- Commit author: `todorPA <todmilan@yahoo.com>`

## Tech stack
React + TypeScript (Vite) · Leaflet (`react-leaflet`) · vis-timeline · GitHub Pages.

## Quick start
```bash
cd /Users/Shared/historycastmap
npm install
npm run dev
```

## Data
- `public/data/geo-events.sample.json` — prototype dataset (3 episodes, 20 events).
- `public/data/geo-events.json` — full dataset (all 181 episodes), added in Phase 3.
- Contract: `geo-events.schema.json`.

## Documentation
| File | Purpose |
|---|---|
| `PLAN.md` | Architecture, phases, folder structure, design rules |
| `SPEC-prototip.md` | Phase 1 build spec (prototype) |
| `SPEC-ohm.md` | Phase 2 plan (OpenHistoricalMap historical borders) |
| `CLAUDE.md` | Instructions for Claude Code |
| `geo-events.schema.json` | Data contract |

## Phases
1. **Prototype** — map + timeline + episode filter + podcast deep-links (sample data). ← current
2. **OHM basemap** — time-aware historical borders.
3. **Full dataset** — all 181 episodes, clustering, performance.
4. **Polish** — routes/paths, search, share-URLs.

## Credits
Content: HistoryCast podcast (rss.com/rs-historycast). Historical borders (Phase 2): OpenHistoricalMap. Base map: OpenStreetMap.
