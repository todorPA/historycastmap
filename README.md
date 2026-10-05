# HistoryCast Map

Interactive, bilingual (EN/SR) map + timeline of historical events extracted from the **HistoryCast** podcast (Serbian) — 178 episodes mapped. Scrub the timeline, filter by episode, click an event to jump to the exact minute in the podcast.

**Interaktivna dvojezična (EN/SR) mapa + vremenska osa istorijskih događaja iz podkasta HistoryCast (178 epizoda na mapi).** Klizaj vremensku osu, filtriraj po epizodi, klikni na događaj da skočiš na tačan minut u podkastu.

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
- `public/data/geo-events.json` — full dataset (178 episodes, 742 events); what the app loads by default.
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
1. **Prototype** — map + timeline + episode filter + podcast deep-links (sample data). Done.
2. **OHM basemap** — time-aware historical borders. Deferred; see `SPEC-ohm.md`.
3. **Full dataset** — 178 episodes, clustering, performance. Done.
4. **Polish** — region filter, search and share-URLs done; routes/paths open. The episode-based
   redesign is in progress: `docs/plans/2026-10-05-redesign.md`.

## Credits
Content: HistoryCast podcast (rss.com/rs-historycast). Historical borders (Phase 2): OpenHistoricalMap. Base map: OpenStreetMap.
