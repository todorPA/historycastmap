# Redesign Phase 3 — The map — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** One map marker per episode, coloured by era, with state styles, era-ringed clusters
and a cluster list; the docked episode card instead of popups; selection that quiets the others
and flies to the episode; the era legend and map controls; then the warm Natural Earth basemap
(HANDOFF §9–§11, §14, §17). Branch `feat/redesign-3-map`, off `feat/redesign-2-panel`.

**Architecture:** Pure, tested modules decide everything about a marker, a cluster, a card
section and a camera move; components render them. The map stops reading events — it reads
matching episodes. The old vis timeline stays until Phase 4 and is adjusted only so it agrees
with the new selection model.

**Tech stack:** as before. Leaflet `L.divIcon` markers (state is CSS); the basemap is Leaflet
GeoJSON on a canvas renderer. No new dependencies.

---

## Assumptions (stated 2026-10-06, easy to reverse)

| Topic | Assumption |
|---|---|
| Overrides (§1) | The prototype HTML is being exported to `docs/design/revamp/prototype.html`. Task 1 builds the override mechanism empty; Task 2 extracts the 36 overrides when the file arrives. Everything works without it. |
| Basemap (§9) | Natural Earth 1:50m vector for the world, cross-fading to the existing (tinted) OSM tiles at close zoom where 1:50m is too coarse. **Last task**, separable: everything before it works on today's tiles. |

## Decisions carried in

| Topic | Decision | Source |
|---|---|---|
| Empty map click | Keeps the selection; only closes the cluster list. | Phase 1 (§21) |
| Refit | On filter change and settled search (kept), on S/M/L and *Prikaži sve*. **Not** on selection — selection flies. | Phase 1, Phase 2 review |
| Copy link | In the card **and** in the panel footer (works with nothing selected). | Phase 1 |
| Era colours | Spec values; deuteranopia limitation recorded in `config/eras.ts`. | Phase 1 |
| Links | A marker click selects the **episode**, so the URL carries `ep`; a chapter click adds `e`. | Phase 2 |
| Graticule | Removed: §9 says no graticule, and the Natural Earth basemap gives the coastline the graticule was standing in for. | §9 |

## Measured before planning

- **97 of 178 episodes share their exact spot with another. Belgrade holds 34**, Rome 11,
  Paris 9, Constantinople, Petrograd and Berlin 5 each. Those stacks never separate by zooming,
  so the cluster list (§9.1) is the only way into them, and for Belgrade it is a list of 34:
  it scrolls, sorts chronologically, and shows era and date per row.
- At the 22 px cell: z3 → 41 marks / 20 clusters (largest 50); z7 → 92 / 20 (largest 35).
- §9.1's click rule (zoom to members, `maxZoom 7`; **list** at zoom ≥ 6.5 or when the members
  are effectively one point) is consistent: below 6.5 a click always gains zoom, at 6.5+ it
  opens the list. It replaces Phase 2's `clusterClickZoom` stopgap.

---

## Tasks

Logic first, all test-first with pure modules; then components; then wiring; basemap last.
Same commit gate as Phase 2 (`tsc` + full suite before each commit).

### Task 1 — Override mechanism
`src/config/episodeOverrides.ts` exports `EPISODE_OVERRIDES: EpisodeOverrides = {}` with the
format documented. Extend `EpisodeOverride` with `title?: { en?: string }` (§1 lists EN titles;
backward-compatible). `useEpisodes()` passes the overrides. Test: an override with an EN title
and a `dateLabel` reaches the view; ids that do not exist are reported by a test (like
`validateCollections`), not silently ignored.

### Task 2 — Extract the prototype's overrides *(when `prototype.html` exists)*
Read the prototype's override table; write it into `episodeOverrides.ts` with a comment saying
where it came from. Test: every override id exists; every `placeId` exists; `from ≤ to`.
Re-check the Phase 1 data facts: extent (−540 today; −550 if *Cezar Drugi deo* is overridden),
place tie-breaks (59 today).

### Task 3 — Card helpers (`src/lib/episodeCard.ts`)
- `neighbours(selected, matching)` → `{ prev, next }`, chronological (`panelModel.chronological`), among the matching set (§10.2 *Mesto u istoriji*, and ←/→).
- `sameTime(selected, matching, limit = 5)` → `{ shown, more }`: episodes whose period overlaps, **other region families first**, then by `|anchor − anchor|` (§10.2 *U isto vreme*).
- `publishedLabel(pubDate, lang)` → `objavljena jul 2026` / `published July 2026`; empty for no date.
- `youtubeSearchUrl(ep, lang)` — the data has no video ids (§10.2).
- `kindLabel(kind, lang)` → `period` / `jedan datum` / `dug period`.
- `mmss(seconds)` → `37:58`, `1:02:05` past an hour.

### Task 4 — Marker and cluster rules (`src/lib/episodeMarkers.ts`)
- `markerState(ep, { selectedId, hoveredId, range })` → `selected | hover | muted | outside | normal` (§9.1, §11). Order: selected > hover > outside > muted > normal.
- `clusterSize(n)` = `24 + min(22, 5·log2 n)` px.
- `eraRing(members)` → a `conic-gradient(…)` string of member era colours, sorted in era order, segments proportional to counts.
- `clusterClick({ zoom, fitZoom, maxZoom })` → `'list'` when `zoom ≥ 6.5` or the members are effectively one point (`fitZoom ≥ maxZoom`), else `{ zoomTo: min(fitZoom, 7) }` — and assert that branch always gains zoom (below 6.5, `min(fitZoom, 7) > zoom` once the members fit a 22 px cell).
- Clustering: reuse `clusterByPixel` with a 22 px cell; `keepSeparate` = selected; out-of-window markers are excluded from clustering entirely (§9.1).
- `chapterPins(ep)` → one pin per place in audio order, numbered by the first chapter there, carrying all its chapter ids.

Test against the real data too: at z7 no in-window cluster click is a no-op; Belgrade's 34 always resolve to `'list'`.

### Task 5 — Camera (`src/lib/camera.ts`)
Pure Web-Mercator maths, no Leaflet import (Leaflet touches `window` at import and cannot load under Node):
- `flyTarget(latLng, { mapWidthPx, cardOpen })` → `{ center, zoom }` with zoom clamped to 4.5–6 and the centre offset left by `min(196, 25% of width)` px so the card does not cover the episode (§10.1).
- `eraWindow(era, extent)` → the era clamped to the data extent, for legend clicks.
Tests: offset direction and size at z5; clamping; antimeridian-free inputs only (the data has none).

### Task 6 — Audio (`src/components/card/useEpisodeAudio.ts`)
One `<audio>` per card. `play(seconds, label)` with states `idle → loading → playing → error`
(the loading state exists because hour-long mp3s on a third-party host take real time to
seek — kept from `EventPopup`), `currentTime` and `duration` for the 3 px progress bar, and the
`audioUrl#t=` fallback link on error. Pure part tested: the state transitions as a reducer.

### Task 7 — Episode markers (`src/components/map/EpisodeMarkers.tsx`)
`L.divIcon` per episode at its primary place; state classes from `markerState`; selected gets the
permanent dark label chip and a one-off 900 ms pulse; hover shows a label chip and sets
`hoveredEpisodeId` (§17), and the list's hover highlights the marker in return. Markers are
keyboard-focusable (`keyboard: true`, `aria-label` = title + date). Filtered-out episodes are not
rendered; the selected one always is.

### Task 8 — Clusters and the cluster list (`src/components/map/EpisodeClusters.tsx`, `ClusterList.tsx`)
Bubble with the era ring and an ink count disc. Click per `clusterClick`. The list popover: title
+ date per member, era glyph, chronological, scrolls (Belgrade: 34), selecting a row selects the
episode; closes on outside click, Esc, or empty-map click. Hover over a member row highlights it
elsewhere.

### Task 9 — Chapter pins (`src/components/map/ChapterPins.tsx`)
Only while an episode is selected: 18 px numbered pins at its chapter places; clicking one opens
that chapter in the card (sets `selectedEventId`).

### Task 10 — The episode card (`src/components/card/*`)
Docked right in the map area (12 px insets, 372 px, slide-in 420 ms, 150 ms content cross-fade on
switch). Header: era dot · `episodeLabel` · `publishedLabel`; serif 27/600 title; date (glyph,
`episodeDate`) · place · `region · kindLabel`; chips (series side, regions, collections) that
toggle their filter, with checks when active. Actions: *Slušaj epizodu*, *YouTube ↗*, copy link.
Inline player (Task 6). *Mesto u istoriji*, *U isto vreme* (+ *i još N*), *Poglavlja*: year(s),
title, `N. place`, `▶ MM:SS`; a row expands to description, quote (serif italic, gold rule),
actor chips, confidence as text + three dots. Close × deselects.

### Task 11 — Legend, map controls, empty pill
- Legend bottom-left: `BOJA = EPOHA`, five era swatches (click → `setRange(eraWindow(…))`), state key *U periodu* / *Van izabranog perioda*, *Sakrij* / *Legenda* toggle.
- Controls top-right, 36 px: zoom +/−, then *Prikaži sve* in its own group; they shift left while the card is open. Leaflet's default zoom control goes.
- Empty-state pill near the top: *Nijedna epizoda ne odgovara filterima.* + *Poništi sve*.

### Task 12 — Wiring and removals
- `MapView` renders episodes, not events: points = matching episodes (selected always included), `FitToMarkers` keyed on filters + settled query + S/M/L; *Prikaži sve* refits.
- Selection: `selectEpisode` → camera `flyTo(flyTarget(…))` (0.85 s, instant under reduced motion); list scrolls (done); card opens. Esc closes the card and deselects; ←/→ step `neighbours`, unless focus is in a text field. Empty map click closes the cluster list only.
- The old vis timeline (until Phase 4): items = chapters of matching episodes, **no longer narrowed** by selection; the selected episode's items get `is-selected`, others `is-muted` while something is selected. Clicking an item selects its episode and that chapter.
- `visibleEvents` loses its interim narrowing (Phase 2) and its test changes with it.
- Remove: `EventPopup`, `EventGroupPopup`, `EventMarkers`, `Legend` (old), `Graticule` + `lib/graticule.ts`, `BasemapSwitcher` UI (config infra stays), `DeselectOnMapClick`, `clusterClickZoom`, and their CSS (same dead-CSS sweep as Phase 2).

### Task 13 — Natural Earth basemap *(separable; last)*
- Owner downloads the 1:50m layers (land, lakes, rivers + lake centrelines, admin-0 boundary lines) — commands given at this task.
- `scripts/build-basemap.mjs`: coordinate rounding + Douglas–Peucker simplification, no dependencies; writes `public/data/basemap/*.json`, committed. Size budget stated in the PR.
- `config/basemaps.ts` gains a `vector` kind (layers + §3.3 colours); `BasemapLayer` renders it on a canvas renderer and cross-fades to the tinted tiles above the zoom where 1:50m gets coarse. Basemap still comes from config, never hardcoded (CLAUDE.md).
- Attribution: *Natural Earth · Leaflet* (and OSM when tiles show); the panel footer follows.

### Task 14 — Verify
`npx vitest run`, `npm run build`. Owner screenshots against `prototype-1..4.png`: the default
map; Belgrade's cluster list; a selected episode with card, pins and quiet others; the legend
toggled; EN. By hand: Esc, ←/→, marker keyboard focus, cluster list scroll, card chips toggling
filters, *Slušaj* and a chapter `▶`, copy link, *Prikaži sve*, reduced motion.
