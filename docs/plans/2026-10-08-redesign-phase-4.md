# Redesign Phase 4 — The timeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace vis-timeline with the handoff's episode timeline: era band, adaptive axis, six
region rows with capped lanes and overflow ticks, sticky in-bar labels, the overview strip with the
draggable Window, the custom vertical rail and "more below" pill, S/M/L with M as default, and the
restyled playback (HANDOFF §12–§13, §17–§18). Branch `feat/redesign-4-timeline`, off
`feat/redesign-3-map`.

**Architecture:** As in Phase 3: pure, tested modules decide geometry (ticks, eras, lanes, labels,
window maths, histogram, rail); components render them as plain DOM. The timeline reads matching
episodes, never events. Reference implementation for every rule: the prototype's timeline code
(`docs/design/revamp/prototype.html`, section `timeline`), ported, not copied.

**Tech stack:** as before. vis-timeline is **removed** (decision of 2026-10-05) — no new
dependencies; text is measured with a canvas 2D context.

---

## Decisions carried in

| Topic | Decision | Source |
|---|---|---|
| Engine | Custom React component; vis-timeline and its CSS go. | Phase 1 |
| Context mode | The prototype's default (`ctx: none`): with a selection, the others are *muted*, no "related" tier. Same as the map. | Phase 3 |
| Out-of-filter episodes | Hidden on the timeline as on the map (§6.5); a row whose episodes are all filtered out is not drawn. | §6.5 |
| States | `markerState` (Phase 3) is the one state function for map and timeline: selected > hover > outside > muted > normal. | Phase 3 |

## Assumptions (stated 2026-10-08, easy to reverse)

| Topic | Assumption |
|---|---|
| Time source | TimeContext stays the single source and stays **integer years** (PLAN §7). The timeline keeps a *float* view only for sub-year smoothness while dragging and tweening, and writes the rounded value through `setRange` every frame; external changes (legend era, URL, playback) move the view. |
| Full extent | `bounds` becomes `timelineExtent(episodes)` (§12.2) instead of the event years. Shared links with `from/to` outside it are clamped as today. |
| Mouse wheel | Scrolls the rows vertically and never zooms (§12.7). Zoom is `−`/`+`, the strip, the era band. |
| Phone | Lane cap 2 and the phone layout are Phase 5. |

---

## Tasks

Logic first, test-first; then components; then wiring and removals. Commit gate as before
(`tsc` + full suite before each commit).

### Task 1 — Axis and era band (`src/lib/timelineAxis.ts`)
- `niceStep(pxPerYear)`: first of `1,2,5,10,20,25,50,100,200,250,500,1000` giving ≥ 70 px, else 2000.
- `axisTicks(view, widthPx)` → `{ year, x, major }[]`; major every 5th step (`year % (5·step) === 0`).
- `eraSegments(view, widthPx)` → eras overlapping the view with clipped `x`, `width`, and `showLabel` when width > 60 px.
- `yearToX(year, view, widthPx)` / `xToYear`.

### Task 2 — Window maths (`src/lib/timelineWindow.ts`)
- `clampView(from, to, bounds, minSpan = 8)`: span clamped to `[8, bounds span]`, then shifted inside bounds.
- `zoomView(view, factor, bounds)` around the centre (`−` = 1/0.6, `+` = 0.6).
- `centreView(view, year, bounds)` (strip click).
- `resizeView(start, handle, dYears, bounds)` for the side handles (min span 8) and `moveView` for the body.
- `selectionView(view, ep, bounds)` (§12.2): if span > 700 or the episode's span > 80 % of the window → `max(3 × span, 320)` centred on the anchor; else recentre only if `from`/`to` is within 10 % of an edge; returns `null` when nothing changes.
- `eraView(era, bounds)`: era clamped to bounds, padded 4 % each side.
- `easeInOutCubic`.

### Task 3 — Rows, lanes and labels (`src/lib/timelineLayout.ts`)
- `layoutItem(ep, { view, widthPx, state, hovered, measure })` → mark extent (`point`: ±7 px around `from`; range/long: `from` → `to + 1`, at least 6 px), label x, `inside` (visible bar wider than label + 18 px; label at `max(barStart, 2) + 8`), and the packing extent. Label width capped at 280 px, plus the date for hover/selected.
- `packRow(items, cap)` → `{ placed (with lane), overflow, lanes }`: priority selected, hover, normal, muted, outside, then by left edge; greedy first-fit; the selected item always gets a lane; items beyond the cap go to `overflow`.
- `buildRows(episodes, …)` → per region family: items, lanes, overflow ticks, `inWindow/total`, height (`lanes·lane + 8 + 12 if overflow`), the edge pill (selected episode off-screen in its row).
- `labelInk(hex)` → `#1B130D` or `#FFFFFF`, whichever is ≥ 4.5 : 1 (via `lib/contrast`).
- Tests use a fixed-width `measure`, plus one run over the real data: no two placed items in a lane overlap; the selected item is never in `overflow`.

### Task 4 — Strip and rail (`src/lib/timelineStrip.ts`)
- `histogram(episodes, bounds, bins = 90)` of anchors → bar heights (`max(3, c / max · 26)`, 0 for empty).
- `stripLabels(bounds)` → start, middle (rounded to 100), end.
- `railThumb({ scrollTop, clientHeight, scrollHeight, railPx })` → `{ top, height }` with height ≥ 28; `null` when not scrollable.
- `itemsBelow(rows, scrollBottom)` → count for the pill.

### Task 5 — Strings
`timelineHint` (*Prevuci prozor ispod ose*), `tlCount` / `tlCountAll` (with the noun agreeing via `plural.ts`), `moreInRow` (*+{n} još*), `collapseRow` (*Skupi*), `moreBelow` (*Još {n} epizod… u ovom periodu — skroluj*, agreeing), `backToTop`, `zoomInTime` / `zoomOutTime`, `playPause` (*Pauza*), size titles *Niska / Srednja / Visoka osa*. SR plural forms tested against `agreeSr`.

### Task 6 — The timeline component (`src/components/timeline/*`)
- `Timeline.tsx` — header (§12.1), era band, axis, rows area, strip; owns the float view and the tween (`useViewTween`, rAF, cancels on pointer-down).
- `TimelineRows.tsx` — label column (name, `inWindow/total`, `+N još`/`Skupi`), tracks with items (diamond / bar / hatched long bar), overflow ticks, gold selection band across rows, edge pills. Item hover → `hoveredEpisodeId`; click → `selectEpisode`.
- `TimelineStrip.tsx` — histogram, dimmed outside, Window with grip and handles, pointer capture; `role="slider"`, `aria-valuetext`, ←/→ move and Shift+←/→ resize from the keyboard.
- `TimelineRail.tsx` — custom rail, fading edges, the pill; native scrollbar hidden.
- `timeline.css` — tokens only; hatch per §12.4.

### Task 7 — Playback restyle
`useTimelinePlayback` keeps its behaviour; its years become the matching episodes' `from`s. *Pusti* / *Pauza* as a word, gold when playing, `aria-pressed`, min-width 7ch; speed button `120 god/s`. Any pointer-down in the timeline stops it.

### Task 8 — Wiring and removals
- `bounds` from `timelineExtent(useEpisodes())`.
- On selection: `selectionView` tween (520 ms) and scroll the row into view.
- Header info `· <b>161</b> / 178 epizoda · 1023–2050`, `aria-live="polite"`, updates every frame.
- S/M/L: default **m**; S shrinks to its content; double-click on the header cycles; resize recalculates; the map refits (kept).
- Remove: `TimelineView.tsx`, vis-timeline (`package.json`, lockfile, CSS), `yearToDate`/`dateToYear` if unused, the old timeline styles in `app.css` (dead-CSS sweep).

### Task 9 — Verify
`npx vitest run`, `npm run build` (bundle size before/after). Owner screenshots against
`prototype-1..4.png`: default (M), a selected episode (gold band, ring, edge pill after zooming
away), a row expanded with *+N još*, scrolled rows with the rail and the pill, S and L. By hand:
drag the Window body and handles, click the strip, `−`/`+`/*Ceo period*, era band click, *Pusti*
stops on a press, wheel scrolls rows, keyboard on the Window.
