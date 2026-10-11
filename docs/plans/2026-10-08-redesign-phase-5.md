# Redesign Phase 5 — Guide, collapsible panel, phone — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** The last of the redesign: the first-use guide (HANDOFF §16), the collapsible left panel
with its floating pill (§2), the phone layout under 720 px (§19), the empty-period state (§20),
and two small leftovers from earlier phases. Branch `feat/redesign-5-guide-phone`, off
`feat/redesign-4-timeline`.

**Architecture:** As before: pure, tested modules for geometry and rules (guide placement, the
nearest episode, cluster merging); components render them. Layout state (panel open, filters
open, phone) lives in `LayoutContext` so the guide, the pill and the phone sheets can drive it.
Reference: the prototype's `first-use guide`, `nav collapse` and `is-m` code and CSS.

---

## Assumptions (stated 2026-10-08, easy to reverse)

| Topic | Assumption |
|---|---|
| Phone test | `window.innerWidth < 720` (the app is the full viewport), via `matchMedia('(max-width: 719.98px)')`. |
| Guide on load | Shown 700 ms after the data loads, once per browser, never on phone, never when the link opens with an episode selected (a shared link is someone's intent, not a first visit's). |
| Panel state | Not in the URL: collapsing is a reading preference, like S/M/L. |
| Cluster merging | Second pass after the grid: clusters whose bubbles overlap by more than a third of the smaller diameter merge (member-weighted centre), repeated until stable. |

---

## Tasks

Logic first, test-first; then components; then phone. Commit gate as before.

### Task 1 — Rules (`src/lib/guide.ts`, `src/lib/emptyPeriod.ts`)
- `spotlightRect(target, pad)`; `guideCardPlacement(step, target, viewport)` → step 1 to the right of the filter button (`left = right + 18`, `top = max(12, top − 18)`); step 2 above the timeline, 420 px wide, centred and kept 16 px inside the viewport, `bottom = viewport.h − target.top + 18`.
- `guideSeen()` / `markGuideSeen()` on `localStorage['hcm-guide-v1']`, try/catch.
- `nearestOutside(matching, range)` → the matching episode closest to the window (by distance from the window to its period), for *Najbliža: …*; null when none.

### Task 2 — Strings
Guide (§16, SR/EN), collapse/expand panel, search on phone, *U ovom periodu nema epizoda. Najbliža:*, the card grab handle.

### Task 3 — Layout state
`panelOpen` / `setPanelOpen`, `filtersOpen` / `setFiltersOpen` (lifted from Sidebar), `usePhone()`; phone forces the panel closed into a sheet (`sheetOpen`).

### Task 4 — Collapsible panel and the map pill (§2)
Chevron in the panel header; the grid column animates 328 → 0 px in 420 ms (the map already follows resizes). Collapsed: a floating pill top-left of the map with the HC mark, search (opens the panel and focuses the box), the active-filter badge, the selected title (re-flies) and an expand chevron.

### Task 5 — First-use guide (§16)
Overlay, spotlight with the 420 ms move, card with the arrow, step 1 on the filter button, step 2 on the timeline with the ①↔ / ②↕ tags and pulsing rings on the Window and the rail. × / Esc close at any step; focus trapped, primary focused; re-placed on resize; closes the filter panel and opens a collapsed panel first.

### Task 6 — Empty period (§20)
When filters match but nothing overlaps the window: a map pill *U ovom periodu nema epizoda. Najbliža: Title 1389* — clicking selects it (which reframes the timeline).

### Task 7 — Phone (§19)
- Top bar: HC mark, *HistoryCast Mapa* (*Mapa* in `--gold-hi`), search button → the panel as a full-screen sheet sliding up; selecting an episode closes it.
- Timeline fixed 210 px; lane cap 2; row labels overlay the track; hidden: S/M/L, speed, `−`/`+`, hint, title.
- Card as a bottom sheet (72 % of the map) with a grab handle toggling a 118 px peek.
- Hidden: legend, collapse control. Filter panel as a sheet over the list. No guide.

### Task 8 — Leftovers
- `stripBranding`: also strip a bare `| HistoryCast` (*Novogodišnji specijal | HistoryCast*). Owner reruns `npm run episodes`.
- Cluster merge pass (`lib/cluster.ts`): Belgrade's 35 no longer half-covered by Smederevo's 2.

### Task 9 — Verify
`npx vitest run`, `npm run build`. Owner: the guide (both steps, Esc, resize, back), collapse/expand with the pill, the empty-period pill, and the phone layout in device mode (sheet, bottom-sheet card and peek, timeline).
