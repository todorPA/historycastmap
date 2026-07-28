# CLAUDE.md — instructions for Claude Code

You are building **HistoryCast Map**, an interactive bilingual (EN/SR) web app that maps historical events extracted from a Serbian history podcast (181 episodes).

## Local project location
Set up and keep the project here:
```
/Users/Shared/historycastmap
```

## Read first (in this order)
1. `PLAN.md` — architecture, tech stack, phases, folder structure, design rules.
2. `SPEC-prototip.md` — the exact build for Phase 1 (do this now).
3. `geo-events.schema.json` — the data contract. Do not deviate.
4. `SPEC-ohm.md` — Phase 2 (later). **But** honor PLAN.md §7 now so Phase 2 needs no refactor.

## Current task: Phase 1 (prototype)
Build the prototype per `SPEC-prototip.md` using `public/data/geo-events.sample.json` (already provided: 3 episodes, 20 events, 16 places). Deliver the acceptance criteria in `PLAN.md §8`.

## Hard rules
- **Stack:** React + TypeScript + Vite. Leaflet (`react-leaflet`) for map, `vis-timeline` for timeline. No other heavy deps without reason.
- **Data model is fixed** by `geo-events.schema.json`. If you think it needs a field, add it in a backward-compatible way and note it in the PR.
- **Design rules (PLAN.md §7) are non-negotiable** — single time source, swappable basemap, normalized places, integer years (BC negative), confidence field. These exist so Phase 2 (OHM) and Phase 3 (full data) drop in without rework.
- **Do not** hardcode the basemap tile URL inside map logic — read it from a `basemap` config (see SPEC-ohm).
- Keep the full dataset out of scope for now; the app must load whichever JSON is configured (sample now, full later) — same shape.

## i18n
- UI labels via `lib/i18n.ts` (`en`/`sr`). Content strings come from data (`.sr`/`.en`, fallback `.sr`).
- Default language: **sr**. Toggle in the sidebar.

## Podcast deep-linking
- Each event has `episodeId` + `timestamp` (MM:SS). Build `audioUrl#t=<seconds>` (see SPEC-prototip §10). Provide an inline `<audio>` fallback that seeks to the time.

## Git / deploy
- Commit author: **todorPA** `<todmilan@yahoo.com>`.
  ```
  git config user.name "todorPA"
  git config user.email "todmilan@yahoo.com"
  ```
- Repo: `https://github.com/todorPA/historycastmap` (branch `main`).
- Deploy to **GitHub Pages**; set `base: '/historycastmap/'` in `vite.config.ts`. All data fetches must respect `import.meta.env.BASE_URL`.
- Commit in logical steps (scaffold → state → map → timeline → sidebar → popup → i18n → deploy). Clear messages.

## Definition of done (Phase 1)
All boxes in `PLAN.md §8` checked, deployed URL works, sample data renders, EN/SR toggle works, "Play at MM:SS" works. Then stop and report back for review before Phase 2.

## Out of scope (do NOT do yet)
- OHM historical basemap (Phase 2).
- Marker clustering, routes/polylines, search (Phase 3/4).
- Generating or editing the dataset — that is produced upstream (Enchanté/LLM from transcripts). You only consume it.
