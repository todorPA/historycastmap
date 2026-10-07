# Redesign Phase 2 — Theme and left panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** The explorer's new cream/gold theme and the new left panel — search, filter button and
panel, active-filter chips, episode count, era-grouped list — built on Phase 1's episode model
(HANDOFF §3–§8, §20). Branch `feat/redesign-2-panel`, off `feat/redesign-1-model`.

**Architecture:** Filter, search, selection and hover state move to episode level in
`FilterContext`, backed by small pure modules with tests. The old map and timeline keep working
by reading *events of the matching episodes* through one shared function; they are replaced in
Phases 3 and 4. The theme is scoped to the explorer, so the landing page is untouched.

**Tech stack:** as Phase 1. No new dependencies.

---

## Decisions (2026-10-05)

| Topic | Decision |
|---|---|
| Fonts | **Commit the font files.** The live site has served none of them since deploys moved to Actions (gitignored, never fetched in CI). |
| UI tests | **Logic tests only.** Component behaviour (focus, Esc, inert, keys) is checked by hand from the owner's screenshots; no DOM testing packages. |
| Theme scope | New tokens live in `src/styles/theme.css`, imported by `app.css` only. `tokens.css` stays as it is, because `landing.css` uses the `--ink-*` ramp directly and the landing page is out of scope. |
| Old chrome | `theme.css` re-points the aliases `app.css` already uses (`--text`, `--muted`, `--gold`, `--control-edge`, …) to the new palette, so the old map and timeline are re-themed now instead of staying grey until Phases 3–4. |
| Selection (interim) | Clicking an episode sets `selectedEpisodeId`. Until Phase 3 the old map and timeline narrow to that episode, as the old episode filter did. "Quiet others" arrives with the new map. |
| Ceo period | Moves to the timeline header now. It only lived in the sidebar stats block, which this phase removes. |
| Copy link | Stays available without a selection (Phase 1 decision): a small action in the panel footer. |
| Counts | Use number agreement, not the fixed `{n} epizoda` of §20: *1 epizoda, 2 epizode, 5 epizoda, 22 epizode*. EN: *1 episode, 2 episodes*. |

## Found while planning

- **No font file contains basic Latin.** The fetch script downloads Fontsource's `latin-ext`
  subset only, which holds č ć š ž đ but not a–z or 0–9, while `fonts.css` declares those files as
  covering U+0000–00FF. So ordinary letters have always rendered in the system font and only the
  diacritics in Plex: two fonts in every Serbian word with a diacritic. Fixed in Task 1, and
  guarded by a test that reads each file's character map.
- **Newsreader has no Cyrillic** (Latin, Latin Extended, Vietnamese only), despite §3.4. Content
  here is Serbian Latin, so nothing needs it; Cyrillic falls back to the next family.

---

### Task 1: Fonts that actually contain their letters

**Files:**
- Create: `scripts/lib/woff2.mjs`, `scripts/fonts.test.mjs`
- Modify: `scripts/fetch-fonts.mjs`, `src/styles/fonts.css`, `.gitignore`
- Add: `public/fonts/*.woff2` (committed)

**Step 1 — reader.** `scripts/lib/woff2.mjs` exports `codePointsOf(path): Set<number>`: parse the
WOFF2 table directory, Brotli-decompress the table stream with `node:zlib`, read `cmap` formats 4
and 12. (Same logic as the probe run during planning.)

**Step 2 — failing test.** `scripts/fonts.test.mjs` parses every `@font-face` in `fonts.css`,
resolves its `src` under `public/`, and for each declared `unicode-range` asserts the file maps a
sample of it: for ranges containing U+0061 that means all of `a–z 0–9`; for U+0100–024F, all of
`čćšžđČĆŠŽĐ`; for U+0400–045F, `жЖ`. Also asserts every file referenced exists. Run → FAIL on all
seven Latin faces (no a–z).

**Step 3 — fetch the latin subset.** In `fetch-fonts.mjs` add, per face, the `latin-<weight>`
file (`…/latin-400-normal.woff2`), and Newsreader: `newsreader:vf@latest/latin-wght-normal`,
`latin-ext-wght-normal`, `latin-wght-italic`, `latin-ext-wght-italic`.
*(Executed differently: versions stay `@latest`. They could not be looked up offline, and with
the files committed the build never downloads, so a CDN update cannot change the site.)*

**Step 4 — owner runs** (network): `npm run fonts`.

**Step 5 — fix `fonts.css`.** One face per subset, each with Fontsource's own range:
- latin: `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`
- latin-ext: `U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF`
- cyrillic: unchanged.
Add Newsreader normal + italic faces (variable weight `200 800`).

**Step 6:** test → PASS. Remove `public/fonts/` from `.gitignore`, commit the files.
Commit: `fix: the fonts never contained a–z; ship them, and test what each file holds`

---

### Task 2: The explorer theme

**Files:** Create `src/styles/theme.css`, `src/styles/theme.test.ts`; modify `src/styles/app.css` (import).

**Step 1 — failing test.** `theme.test.ts` imports `./theme.css?raw`, parses `--name: #hex`
pairs, and asserts the §3 contrast claims with the WCAG formula (reuse `onColor`'s luminance from
`config/regions.ts` — extract `contrastRatio(a, b)` into `src/lib/contrast.ts` and test it):
`--tx`/`--f1` ≥ 15, `--tx2`/`--f1` ≥ 9, `--tx3`/`--f1` ≥ 6.5 and `--tx3`/`--f3` ≥ 5.4,
`--gold-hi`/`--f1` ≥ 7, `--gold-line`/`--f1` ≥ 4.5, `--line`/`--f1` ≥ 3, `#1B130D`/`--gold` ≥ 8.
These are the handoff's own numbers; if one fails, report it rather than nudge the value.

**Step 2 — implement `theme.css`:** a `:root` block with §3's tokens (`--f0…--f4`, `--line`,
`--line-soft`, `--tx…--tx3`, `--gold`, `--gold-hi`, `--gold-line`, `--gold-bg`, `--ring`,
`--ink: #2A2019`, `--on-gold: #1B130D`, radii `--r-4/6/10`, `--shadow-float`,
`--ease: cubic-bezier(.3,.7,.2,1)`, `--font-serif: 'Newsreader', Georgia, serif`), then the alias
re-points: `--bg: var(--f0)`, `--sidebar: var(--f1)`, `--sidebar-2: var(--f2)`, `--text: var(--tx)`,
`--muted: var(--tx3)`, `--line: …` (the old `--line` collides with §3's `--line` name — the new
value wins and means the same thing, a control border), `--control-edge: var(--line)`,
`--gold: #D4AA55`, `--gold-deep: var(--gold-hi)`, `--gold-wash: var(--gold-bg)`, `--lit-*`, the
`--ink-*` ramp **inside this file only**. Global `:focus-visible` rule; `prefers-reduced-motion`
rule that sets transition and animation durations to 1 ms.

**Step 3:** import it in `app.css` right after `tokens.css`. Test → PASS. Build.
Commit: `design: the HistoryCast cream-and-gold theme, scoped to the explorer`

---

### Task 3: Number agreement in the app

**Files:** Create `src/lib/plural.ts`, `src/lib/plural.test.ts`.

```ts
import type { Lang } from '../types/events';

/** Serbian numeral agreement: 1 epizoda, 2–4 epizode, 5+ epizoda, teens always plural. */
export function agreeSr(n: number, [one, few, many]: [string, string, string]): string {
  const last2 = n % 100, last1 = n % 10;
  if (last2 >= 11 && last2 <= 14) return many;
  if (last1 === 1) return one;
  if (last1 >= 2 && last1 <= 4) return few;
  return many;
}

/** "178 epizoda", "22 epizode", "1 episode", "2 episodes". */
export function episodeCount(n: number, lang: Lang): string {
  return lang === 'en'
    ? `${n} ${n === 1 ? 'episode' : 'episodes'}`
    : `${n} ${agreeSr(n, ['epizoda', 'epizode', 'epizoda'])}`;
}
```

Tests: 1, 2, 4, 5, 11, 12, 14, 21, 22, 101, 111, 178 in SR; 1 and 2 in EN. Same table as
`scripts/lib/serbian.test.mjs`; the two implementations must agree — add one test that imports
both (the `.mjs` is importable from vitest) and compares 0–300. Commit:
`feat: count episodes in grammatical Serbian`

---

### Task 4: Episode-level filter state

**Files:** Create `src/state/filterState.ts` + test; modify `src/state/FilterContext.tsx`.

**Pure part** (`filterState.ts`), tested:

```ts
import type { EpisodeFilterState, FilterGroup } from '../lib/episodeFilters';

/** Add the value to its group, or remove it if present. Returns a new state. */
export function toggleFilterValue(f: EpisodeFilterState, group: FilterGroup, value: string): EpisodeFilterState {
  const list = f[group] as string[];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return { ...f, [group]: next } as EpisodeFilterState;
}

/** Toggle selection: picking the selected episode again deselects it (§7). */
export function toggleSelection(current: string | null, id: string): string | null {
  return current === id ? null : id;
}
```

**Context.** Replace `activeCollectionId`, `activeEpisodeId`, `activeRegions`, `activeTypes`,
`activeSeries` and their togglers with:

```ts
filters: EpisodeFilterState;
toggleFilter: (group: FilterGroup, value: string) => void;
clearFilters: () => void;              // all four groups, Zbirke included (§6.4)
query: string;
setQuery: (q: string) => void;
selectedEpisodeId: string | null;
selectEpisode: (id: string | null) => void;
toggleEpisode: (id: string) => void;   // list rows (§7)
hoveredEpisodeId: string | null;
setHoveredEpisodeId: (id: string | null) => void;
```

Keep `selectedEventId`, `lang`, `basemapId`, `timelineSize` as they are. Any filter change clears
`selectedEventId` (as today). `initial` takes `collections`, `regions`, `types`, `series`,
`episodeId`, `eventId`.
Commit: `refactor: filters, search and selection at episode level`

---

### Task 5: What the views show

**Files:** Create `src/lib/episodeVisibility.ts` + test; modify `src/state/DataContext.tsx`;
delete `src/lib/visibility.ts` and its test (event-level facets are superseded).

```ts
import type { HistoryEvent, Lang, PlacesById } from '../types/events';
import type { EpisodeView } from './episodeModel';
import { matchesFilters, type CollectionMembers, type EpisodeFilterState } from './episodeFilters';
import { matchesQuery } from './episodeSearch';

/** Episodes passing filters and search. The selected one always stays (§6.5). */
export function matchingEpisodes(
  episodes: EpisodeView[], f: EpisodeFilterState, members: CollectionMembers,
  query: string, places: PlacesById, lang: Lang, selectedId: string | null,
): EpisodeView[] {
  return episodes.filter(
    (e) => e.id === selectedId || (matchesFilters(e, f, members) && matchesQuery(e, query, places, lang)),
  );
}

/** Does a span overlap the window? Spans count, not just their start. */
export function overlaps(from: number, to: number, range: { from: number; to: number }): boolean {
  return to >= range.from && from <= range.to;
}

/**
 * The events the (old, event-based) map and timeline draw: every chapter of a matching
 * episode that overlaps the window. Interim until Phase 3: when an episode is selected, only
 * its chapters — the old episode filter's behaviour.
 */
export function visibleEvents(
  events: HistoryEvent[], matchingIds: ReadonlySet<string>, selectedId: string | null,
  range: { from: number; to: number },
): HistoryEvent[] {
  return events.filter(
    (e) => (selectedId ? e.episodeId === selectedId : matchingIds.has(e.episodeId)) &&
      overlaps(e.year, e.yearEnd ?? e.year, range),
  );
}
```

Tests: selected kept despite filters; search ANDed; span overlap at both edges; interim selection.
DataContext gains `useEpisodes()` (memo `deriveEpisodes(data)`), `useMatchingEpisodes()`, and a
rewritten `useVisibleEvents()` on top of these. Remove `useCollectionEpisodes`.
Commit: `refactor: one rule for what every view shows, at episode level`

---

### Task 6: URL state for the new model

**Files:** modify `src/lib/urlState.ts`, `src/lib/urlState.test.ts`, `src/components/UrlSync.tsx`, `src/App.tsx`.

- `col` becomes a comma list, allow-listed against `COLLECTIONS` ids (old single-id links keep
  working — a one-item list). Unknown ids dropped.
- `ep` → `selectedEpisodeId`. `e` keeps the event and, when `ep` is absent, selects its episode
  (resolved in `Loader` once data is loaded).
- `r`, `ty`, `se`, `from`, `to`, `lang`, `bm`, `data` unchanged.
- `App.tsx`: a link with collections and no period still opens framed on them — the union of
  their spans (`collectionSpan` per collection, min/max).

Tests: multi-collection round trip; single legacy `?col=antika`; unknown collection dropped.
Commit: `feat: shareable links carry several collections and the selected episode`

---

### Task 7: List and chip helpers

**Files:** Create `src/lib/panelModel.ts` + test.

```ts
/** Era groups in chronological order, each with its episodes and how many are in the window. */
export function groupByEra(episodes: EpisodeView[], range): Array<{ era: Era; episodes: EpisodeView[]; inWindow: number }>
/** Chronological: anchor, then start, then SR title — a stable order for ↑/↓ and ←/→. */
export function chronological(a: EpisodeView, b: EpisodeView): number
/** One removable chip per active value, in group order, labelled in the UI language. */
export function activeChips(f: EpisodeFilterState, lang: Lang): Array<{ group: FilterGroup; value: string; label: string }>
/** "178 epizoda · 499. p.n.e. – 2009" (§4.2). */
export function universeLine(episodes: EpisodeView[], lang: Lang): string
```

Labels: collection title (`COLLECTIONS`), `series_main`/`series_side` (i18n), `regionLabel`,
`type_<value>` (i18n). Tests include: empty eras omitted; `inWindow` counts by overlap; chip order;
universe line on the real data reads `178 epizoda · 499. p.n.e. – 2009`.
Commit: `feat: the pure pieces of the episode list and chip row`

---

### Task 8: Strings

**Files:** `src/lib/i18n.ts`. Add the §20 keys (search placeholder, filter groups, footer, empty
states, unavailable option, size titles, playback words) plus `mapaIstorije`, `filters`,
`filtersCount` (aria), `clearAll`, `done`, `close`, `copyLink`, `linkCopied`, `source`,
`matchPerson` (`ličnost` / `person`), `matchPlace` (`mesto` / `place`). Remove keys no longer
used after Task 10 (`allEpisodes`, `visibleEvents`, `countUnit`, …) — `tsc` will list them.
Add a test that the `en` dictionary has exactly the `sr` keys.
Commit: `feat: the panel's strings in both languages`

---

### Task 9: Panel components

**Files:** Create in `src/components/panel/`: `PanelHeader.tsx`, `SearchBox.tsx`,
`FilterButton.tsx`, `FilterPanel.tsx`, `ActiveChips.tsx`, `EpisodeList.tsx`, `PanelFooter.tsx`;
`src/styles/panel.css` (imported by `app.css`). Rewrite `Sidebar.tsx` to compose them. Delete
`Collections.tsx`, `FacetFilters.tsx` and their CSS.

Built to §4–§8 and `prototype-1..3.png`. The behaviour to get right, each checked by hand:

- **SearchBox:** 40 px; placeholder per §20; `/` focuses it from anywhere (not while typing in
  another field); `Esc` clears; `Enter` selects the first result.
- **FilterButton:** 40×40, three-line icon; active state; badge = `activeFilterCount`, hidden at 0;
  `aria-expanded`, `aria-controls="fpanel"`, `aria-label` with the count.
- **FilterPanel** (`id="fpanel"`): absolutely positioned from under the search row to the panel
  bottom, over chips/count/list; 260 ms slide + fade; list gets `inert` while open; focus moves
  in on open and back to the button on close; closes on ×, *Gotovo*, `Esc`, button.
  Groups in order Zbirke (blurb when exactly one active) → Serijal → Region (family subheads;
  Balkan and Azija together last, no subhead) → Vrsta. Chips: counts from `chipCounts` with
  search ANDed; disabled per `isChipDisabled` with dashed border, `--tx3`, `disabled`, title;
  active = check icon + gold. Footer: *Poništi sve* (disabled when nothing active) and
  *Gotovo · N epizoda*.
- **ActiveChips:** only when filters are active; `label ×` per value; *Poništi sve*.
- **Count:** `<b>178</b> epizoda` or `<b>12</b> / 178 epizoda`, via `episodeCount`.
- **EpisodeList:** era groups with sticky headers (swatch with ink ring, serif italic name,
  years, `inWindow/total`); rows with the kind glyph in era colour (◆ point, ▬ range, hatched ▭
  long), title (2 lines max), meta `from–to · place`; states hover (`--f2`, sets
  `hoveredEpisodeId`), selected (`--f3`, inset gold outline, bold `--gold-hi`), outside window
  (`--tx2`/`--tx3`, glyph 55%); click toggles selection; ↑/↓ moves focus between rows; the
  selected row scrolls into view. Match line under a row when the search hit is not the title,
  with the match highlighted (`range` from `searchEpisode`). Empty state with *Poništi sve*.
- **PanelHeader:** HC mark, *HistoryCast* (serif 18/600), *MAPA ISTORIJE*, `LangToggle` (gold
  active), and the universe line beneath.
- **PanelFooter:** `Izvor: HistoryCast · OpenStreetMap` (Natural Earth arrives with Phase 3's
  basemap) and the copy-link action.

Commit per component or pair; final: `feat: the new left panel`

---

### Task 10: Keep the old map and timeline working

**Files:** `MapView.tsx`, `EventMarkers.tsx`, `EventGroupPopup.tsx`, `TimelineView.tsx`, `Legend.tsx`.

- Replace reads of the removed fields with `useVisibleEvents()` / `useMatchingEpisodes()` and
  `selectedEpisodeId`. Timeline items: `visibleEvents(events, matchingIds, selectedId, UNBOUNDED)`.
- `fitKey` uses `filters`, `query` and `selectedEpisodeId` (refit on filter change — kept).
- Timeline header: add *Ceo period* (`resetRange`), disabled at full range.
- The popup's "episode" link selects the episode instead of filtering.

`npx tsc` lists every remaining reference. Commit: `refactor: the map and timeline read the episode-level state`

---

### Task 11: Verify

1. `npx vitest run`, `npm run build` — clean.
2. Owner screenshots, compared with `prototype-1..3.png`: default panel; filter panel open, no
   filters; *Srpski srednji vek* + *Moderna Srbija* (expect 21, the same counts as
   `prototype-3.png`); a search with a match line (`kosov`, `dusan`, `48. p.n.e.`); EN.
3. By hand: `/`, Enter, Esc; filter panel focus in/out; ↑/↓; disabled chip unclickable; the
   active chip ×; *Poništi sve* in both places; copy link with nothing selected; *Ceo period*.
4. Fonts: in DevTools → Network, the `latin` files load; computed font on body text is IBM Plex
   Sans; titles Newsreader.
5. Push; open PR `feat/redesign-2-panel` → `main` (after #5 merges, it shows only Phase 2).
