# HistoryCast Map: developer handoff

> Saved verbatim from the Claude Design handoff, 2026-10-05. The implementation plan
> (`docs/plans/2026-10-05-redesign.md`) cites this document by section number.
> Decisions taken against it are recorded in the plan, not edited in here.

**Scope:** the map application only (`/app.html`). The landing page is out of scope.
**Baseline:** the developer's latest map, `https://todorpa.github.io/historycastmap/app.html` (repo `todorPA/historycastmap`, `main` @ `1d33eac`).
**Target:** the final HistoryCast Map prototype (light theme, current era colours, current left panel).

This document answers one question: *what changed from the current map version, and what has to be implemented so it matches the final prototype?*

The prototype is a single-file HTML/JS mock-up (Leaflet plus a hand-built timeline). Treat it as the **visual and behavioural reference**, not as code to copy. Keep the existing React, Leaflet, vis-timeline and data pipeline (see §21).

---

## 0. Summary of the biggest changes

| # | Area | Baseline (developer) | Final |
|---|---|---|---|
| 1 | Map object | One marker per **event** (place + year), coloured by **region** | One marker per **episode**, coloured by **era** |
| 2 | Theme | Light warm-grey, gold only as a fill, achromatic chrome | Light **warm cream/beige** HistoryCast palette (tokens in §3) |
| 3 | Left panel | Zbirke list → Epizode list → always-visible Filters → stats block | Search + **filter button** → filter chips → episode count → **list grouped by era** |
| 4 | Filters | Chips always visible below the list; counts in events | **Panel expands down over the list**; instant; **badge** with count; **dependent (disabled) options**; Zbirke inside Filters |
| 5 | Selection | Clicking an episode **filters the map** to that episode; Leaflet popup | Selecting **keeps the context**: others are muted; **docked episode card** |
| 6 | Timeline items | vis-timeline items are events, grouped by 12 regions | Items are **episodes**: diamond / bar / hatched bar, in **6 region rows**, era-coloured |
| 7 | Timeline window | vis drag/zoom on the axis | **Window**: draggable gold window on an overview strip under the axis, plus a **vertical scroll rail** with cues |
| 8 | Timeline height | S/M/L, default **S** | S/M/L, default **M** |
| 9 | Range readout | Range in the timeline header; stats block in the sidebar | One line next to the hint: `Prevuci prozor ispod ose · 161 / 178 epizoda · 1023–2050` |
| 10 | Onboarding | none | **Two-step first-use guide** (Filters, Timeline) |

---

## 1. Data (keep the dataset; derive episode-level fields)

The final prototype uses the developer's current dataset unchanged: `public/data/geo-events.json`, with 178 episodes (151 `main`, 27 `side`), 742 events and 285 places. Collections come from `src/config/collections.ts` (6 collections).

**No schema change is required.** The map works on episodes, so a few episode-level values are **derived client-side** from that episode's events ("chapters"):

| Derived field | Rule used in the prototype |
|---|---|
| `from`, `to` | Min `year` / max `yearEnd ?? year` over the episode's events, **after trimming outliers**: compute each event's mid-year, take Q1/Q3, and keep events within `[Q1 − f, Q3 + f]` where `f = 1.5·(Q3−Q1) + 40` years. This drops "legacy" chapters such as a 1998 discovery in a medieval episode. |
| `kind` | `point` if `to − from ≤ 1`; `long` if `to − from > 150`; otherwise `range` |
| `anchor` | `point` → `from`; else `round((from + to) / 2)`. Used for era, sorting and chronology. |
| Primary place | Most frequent `placeId` among the kept events; on a tie, the place whose event is closest to the median year |
| Region (timeline row) | Most frequent `region` among the kept events, mapped to one of 6 rows (§12.3) |
| `regions` (filter) | Set of all event `region`s in the episode |
| `types` (filter) | Set of all event `type`s in the episode |
| `series` | Episode `series` (`main` if absent) |

**Optional overrides (recommended):** some auto-derived values are imperfect. For example, "Prvi krstaški rat" lands in Toledo because of a tie. The prototype used hand-checked overrides for 36 episodes (period, place, `dateLabel` such as `28. jun 1389.`, EN title). If you want this, add an **optional** override map (episode id → `{from, to, kind, placeId, dateLabel{sr,en}}`). Everything must keep working without it.

**Episode label in the card eyebrow** (ids without a number):

- leading digits in the id → `Epizoda N`;
- id contains `cetvrtkom` → `HistoryCast četvrtkom`;
- id contains `nedeljom` → `HistoryCast nedeljom`;
- id starts with `specijal` → `Specijal`;
- otherwise `Tematska epizoda` if `series=side`, else `Epizoda bez broja`.

---

## 2. Overall layout

```
┌────────────────┬──────────────────────────────────────┐
│ LEFT PANEL     │ MAP                    [episode card]│
│ 328 px         │                                      │
│ (collapsible)  ├──────────────────────────────────────┤
│                │ TIMELINE (S / M / L, default M)      │
└────────────────┴──────────────────────────────────────┘
```

- **Grid:** `grid-template-columns: 328px 1fr`; the main area is `grid-template-rows: 1fr auto` (map, then timeline).
- **Collapsible left panel (new):**
  - A chevron in the panel header collapses the column to `0px`, with a 420 ms transition on `grid-template-columns` and `map.invalidateSize()` called during the transition.
  - When collapsed, a **floating control** appears at the top-left of the map. It contains the HC mark, a search button, the active-filter badge, the selected episode title and an expand chevron.
- **Floating map controls:** zoom +/−, then "Prikaži sve" (fit all) in a separate group, top-right, 36 px buttons. They shift left when the episode card is open.
- **Removed:** the floating status bubble at the top of the map (its information moved to the timeline, §12.5) and the sidebar stats block.

---

## 3. Theme and design tokens (light only)

There is only one theme and no theme switcher.

### 3.1 Surfaces and text

| Token | Value | Use |
|---|---|---|
| `--f0` | `#E3D6C0` | App ground behind panels |
| `--f1` | `#F7F0E3` | Panels: left panel, timeline, card, filter panel, guide |
| `--f2` | `#EFE6D5` | Inputs, raised areas, track backgrounds |
| `--f3` | `#E6DAC5` | Hover, selected row background |
| `--f4` | `#D8C9AF` | Stronger fills (badge backgrounds) |
| `--line` | `#95826A` | Control borders (3.3:1 on `--f1`) |
| `--line-soft` | `#DCCFBA` | Dividers |
| `--tx` | `#21170F` | Primary text (15.5:1 on `--f1`) |
| `--tx2` | `#4A3C2F` | Secondary text (9.4:1) |
| `--tx3` | `#645241` | Tertiary text and metadata (6.6:1; 5.4:1 on `--f3`) |

### 3.2 Gold

| Token | Value | Use |
|---|---|---|
| `--gold` | `#D4AA55` | **Fills only**: primary button, badges, active S/M/L, play while playing. Text on it is `#1B130D` (8.5:1). |
| `--gold-hi` | `#6A4A10` | Gold **as text**: selected titles, links, the timeline range (7.1:1) |
| `--gold-line` | `#8A6620` | Gold **as a line**: selected outlines, window border, active chip border (4.6:1) |
| `--gold-bg` | `rgba(212,170,85,.22)` | Active chip and selected backgrounds |

### 3.3 Other

| Token | Value | Use |
|---|---|---|
| `--ring` | `rgba(30,20,12,.8)` | Ink outline on every data mark (§13) |
| Map land / water | `#F2EADB` / `#D3D9D0` | Prototype basemap |
| Map borders / rivers | `#C9B99D` / `#BCC9C4` | Prototype basemap |
| Map ink | `#2A2019` | Marker selection ring, cluster centre |

### 3.4 Type, shape, focus

- **Type:**
  - `IBM Plex Sans` for UI; `Newsreader` (serif) for episode titles, era names, card and guide titles. Both have Latin Extended plus Cyrillic coverage and are already used or available.
  - Years and counts use `font-variant-numeric: tabular-nums`.
- **Radii:** 4 px (small controls), 6 px (buttons, inputs, rows), 10 px (card, legend, filter panel, guide, cluster list).
- **Elevation:** only floating elements get a shadow (card, legend, collapsed-panel control, guide).
- **Focus:** `:focus-visible { outline: 2px solid var(--gold-line); outline-offset: 2px }`.

---

## 4. Left panel (Current structure)

From top to bottom:

1. **Header:** HC mark, "HistoryCast" (serif 18/600), sub-label "MAPA ISTORIJE" (11 px/600, tracked, `--gold-hi`), SR/EN toggle (active = gold fill), collapse chevron.
2. **Universe line:** `178 epizoda · 509. p.n.e. – 2009`. Episode count and the min/max of the derived `from`/`to`.
3. **Search row:** search input (40 px, flexible width) plus **filter button** (40×40) on the right (§6).
4. **Active filter chips** (only when filters are active): one removable chip per active value (`label ×`), then `Poništi sve`.
5. **Episode count:** `178 epizoda` or `12 / 178 epizoda` (§8).
6. **Episode list** (§7).
7. **Footer:** `Izvor: HistoryCast · Natural Earth`.

**Removed from the baseline sidebar:**

- the Zbirke section (moved into Filters);
- the "Sve epizode" row;
- the always-visible facet chips (moved into the filter panel);
- the stats block ("Vidljivih događaja", "Period", "Ceo period", "Kopiraj link na ovaj prikaz"). Period and count moved to the timeline; "Ceo period" exists in the timeline header; the copy-link action moved into the episode card.

There are **no** sorting tabs: "Hronološki / Po broju" are removed.

---

## 5. Search

| | Baseline | Final |
|---|---|---|
| Fields searched | Episode title, episode number | Episode title (SR+EN), episode number, **event titles, actors, place names**, and **years**. A 2–4 digit query matches episodes whose `from ≤ year ≤ to`. |
| Matching | Diacritic-insensitive | Diacritic-insensitive (`č ć → c`, `š → s`, `ž → z`, `đ → dj`, NFD strip) |
| Scope | Inside the active collection | Combined with the filters (search AND filters) |
| Result rows | Plain rows | Row plus a **match line** when the hit is not in the title: `↳ 1389 · Bitka na Kosovu`, `ličnost: Stefan Dušan`, `mesto: Skoplje`. The matched substring is highlighted. |
| Keys | n/a | `Enter` selects the first result; `Esc` clears; `/` focuses search from anywhere |
| Placeholder | `Pretraži epizode…` | `Epizode, ličnosti, mesta, godine…` / `Episodes, people, places, years…` |

On the map and timeline, search mismatches are treated as **filtered out** (hidden), the same as filters.

---

## 6. Filters

### 6.1 Filter button

- 40×40 px, next to search. Icon: three horizontal lines of decreasing length (stroke 2).
- **Active state:** `--gold-bg` fill, `--gold-line` border, `--gold-hi` icon.
- **Badge** with the count of active filter values: top-right, 19 px circle, `--gold` fill, `#1B130D` text 11.5/700, 2 px `--f1` outline. Hidden at 0.
- `aria-expanded`, `aria-controls="fpanel"`, `aria-label="Filteri (N)"`.

### 6.2 Panel layout and behaviour

- Expands **downward** from just under the search row to the bottom of the left panel, with a 260 ms slide-and-fade. It **physically covers** the active chips, the count and the episode list.
- While it is open, the episode list is `inert`.
- Closes with ×, `Gotovo`, `Esc`, or the filter button again. Focus moves to the panel on open and back to the button on close.
- **Instant apply:** every chip toggle immediately updates the list, map, timeline, counts and badge. There is no Apply button.

### 6.3 Contents, in order

| Group | Values | Notes |
|---|---|---|
| **Zbirke** | The 6 collections from `config/collections.ts` | Multi-select (OR). When exactly one is active, its `blurb` is shown under the group. |
| **Serijal** | `Glavna serija` (main), `Tematske epizode` (side) | Per episode |
| **Region** | The 12 data regions, grouped under the 6 timeline row families (§12.3) with italic family subheads | An episode matches if **any** of its events is in the region. Single-region families (Balkan, Azija) are listed together in a last row without a subhead. |
| **Vrsta događaja u epizodi** | The 12 event types (`bitka`, `opsada`, …, `ostalo`) | An episode matches if **any** of its events has the type |

**Footer:** `Poništi sve` (link, disabled when nothing is active) and the primary button `Gotovo · N epizoda`. `N` is the live result count.

### 6.4 Logic

- **OR within a group, AND across groups**; search is ANDed on top.
- **Chip count** = number of episodes that would match if this value were added to the other groups' current selection. It excludes the chip's own group, the same logic as the baseline, but it counts **episodes, not events**.
- **Dependent options:** a chip whose count is `0` and that is not active is **disabled**. It stays visible and gets:
  - the `disabled` attribute;
  - dashed `--line` border, `--tx3` text, regular weight;
  - `title="Nije dostupno uz izabrane filtere"`.

  Active chips are never disabled, so they can always be removed. This is recalculated on every change. Example: selecting `Srpski srednji vek` disables `Zapadna Evropa`, `Azija`, `Tematske epizode`, etc.
- **`Poništi sve` clears everything**: Zbirke, Serijal, Region, Vrsta. The badge, chips, counts, list, map and timeline all return to the full set. This applies both in the panel and in the chip row under search.
- **Active chip style:** `--gold-bg` fill, 1.5 px `--gold-line` border, `--gold-hi` 600 text, and a **check-mark icon** before the label, so the state is not shown by colour alone.

### 6.5 Episodes outside the filter: hidden

- They are **hidden** from the list, the map and the timeline.
- Timeline rows with no matching episode disappear while filters are active. The overview histogram counts only matching episodes.
- The currently **selected** episode stays visible even if a filter excludes it.

**Empty states:**

- List: `Nijedna epizoda ne odgovara filterima.` / `Probaj da ukloniš neki filter ili zbirku.` with a `Poništi sve` link.
- Map: a pill near the top with the same text and `Poništi sve`.

---

## 7. Episode list

| | Baseline | Final |
|---|---|---|
| Order | By episode number | **Chronological by `anchor`, grouped by era** |
| Group header | — | Sticky header: era swatch (era colour, 1 px ink ring), era name (serif italic 15.5/600), years (`600–1453`), and `inWindow/total` count (`5/31`) that updates while the timeline window moves |
| Row | Number badge + title + event count | Date-type glyph in era colour (◆ point, ▬ range, hollow hatched ▭ long) · title (14.5/500, max 2 lines) · meta `1331–1355 · Skoplje` (12.5, `--tx2`) |
| Row states | Active = gold wash | **Hover** = `--f2` (synced with map and timeline hover); **selected** = `--f3` background, 1.5 px `--gold-line` inset outline, title bold `--gold-hi`; **outside the current time window** = title `--tx2`, meta `--tx3`, glyph at 55% |
| Click | Filters the map to that episode | **Selects** the episode (§10). Clicking the selected row again deselects it. |
| Keys | — | ↑/↓ moves between rows |

Episode numbers are no longer shown in the list; they appear in the card eyebrow.

---

## 8. Episode count

- In the left panel, above the list: `<b>178</b> epizoda` when there is no filter or search. With a filter or search active: `<b>12</b> / 178 epizoda` (EN: `12 / 178 episodes`).
- The unit is **episodes**. The baseline's "događaja" unit caption is removed.
- The timeline header has its own synced count (§12.5).

---

## 9. Map

| | Baseline | Final |
|---|---|---|
| Library | Leaflet | Leaflet (**keep**) |
| Basemap | Desaturated grey tiles + graticule | Warm paper look: land `#F2EADB`, water `#D3D9D0`, borders `#C9B99D` 0.8 px, rivers `#BCC9C4`; no graticule. Keep your tile and basemap infrastructure and approximate these colours with a warm, low-label style if one is available. |
| Legend | Region list, top 8 + "+N" | Bottom-left, `BOJA = EPOHA` + 5 era swatches (clicking one zooms the timeline to that era) + state key (`U periodu` / `Van izabranog perioda`) + `Sakrij` / `Legenda` toggle |
| Status bubble | Floating at the top | **Removed** (§12.5) |
| Refit | Refits on episode, collection or facet change | Refits on "Prikaži sve" and on a **timeline size change** (S/M/L) only. Selecting an episode flies to it (§10). |
| Hover | — | Hovering a marker highlights the same episode in the list and on the timeline, and vice versa |

### 9.1 Markers (one per episode)

All markers are `L.divIcon` elements so their state can be styled with CSS. Fill = era colour (§14).

| State | Size | Treatment |
|---|---|---|
| Normal (in window) | 12 px | 1.5 px paper ring + 1.1 px ink ring (`--ring`) |
| Hover | 16 px | Paper + 3.5 px ink ring; label chip (title + date) |
| Muted (another episode is selected) | 9 px | 60% opacity, thinner rings |
| Outside the time window | 6 px | 35% opacity, ink hairline. Never clustered. |
| Filtered out | — | **Not rendered** |
| **Selected** | 20 px | 2.5 px paper + 5 px ink ring; permanent label chip with `--ink` background, `#F7F0E3` text and a 1.5 px gold ring; one-off pulse ring (900 ms) |

- **Clusters:**
  - Grid clustering with a 22 px radius, recomputed on `zoomend` and on state change. Selected and out-of-window markers are excluded.
  - Bubble size `24 + min(22, 5·log2(n))` px. A **conic ring** shows member era colours (sorted); the inner ink disc shows the count (12.5/700, paper text).
  - Click: zoom to the members (padding 80, maxZoom 7). If the members are effectively at one point or zoom ≥ 6.5, show a **list popover** instead (title + date per member).
- **Chapter pins:** only while an episode is selected, numbered 18 px pins (paper fill, ink border) at the selected episode's event places, grouped by place. Clicking a pin opens that chapter in the card.
- **Clicking empty map:** in the prototype this only closes the cluster list (it does **not** deselect). The baseline deselects; see §21.

---

## 10. Selection model and episode card

### 10.1 Selecting

Every entry point produces the same result:

- entry points: list row, marker, cluster list item, timeline item, card links, `←/→` keys;
- **map:** `flyTo` the episode (0.85 s), zoom clamped to 4.5–6, with the centre offset left by `min(196 px, 25% of the map width)` so the card doesn't cover it;
- **timeline:** the window tweens to the episode (§12.2) and scrolls vertically to its row;
- **list:** scrolls to the row (smooth);
- the card opens.

`Esc` closes the card and deselects; `←/→` go to the previous/next episode in chronological order (among the matching set).

### 10.2 Card (replaces the Leaflet popup)

- **Container:** docked inside the map area, right side, `top/right/bottom: 12px`, width 372 px.
  - Surface `--f1`, 1 px `--line` border, 10 px radius.
  - Shadow `0 12px 32px rgba(60,40,20,.18)`.
  - Slides in from the right (420 ms). Content cross-fades (150 ms) when switching episodes.
- **Header:**
  - Eyebrow (12/600 tracked, `--tx2`): era-colour dot · `Epizoda 144 · objavljena jul 2026`, or the label from §1.
  - Title: serif 27/600.
  - Meta: date-type glyph + date (16/600, `--gold-hi`; uses `dateLabel` if present, e.g. `28. jun 1389.`) · pin icon + place · `Region · vrsta datuma` (`period`, `jedan datum`, `dug period`).
  - Chips: `Tematske epizode` (only if `series=side`), the episode's regions, and the collections it belongs to. Clicking a chip **toggles that filter**; active chips show a check mark.
- **Actions:**
  - `▶ Slušaj epizodu`: primary, gold fill.
  - `YouTube ↗`: secondary. Currently a YouTube search link, because the data has no video ids.
  - Copy-link icon button.
- **Inline player:** after play, it shows `♪ Sada svira: <chapter title>`, mm:ss and a 3 px progress bar. On failure: `Pregledač ovde ne može da pusti audio.` + `Otvori mp3 ↗` (`audioUrl#t=seconds`). Keep the baseline's loading / error states (spinner, "Učitavanje zvuka…").
- **Mesto u istoriji:** two buttons, the previous and the next episode in chronological order (among the matching episodes). Each shows its date and title; disabled when there is none.
- **U isto vreme:** up to 5 episodes whose period overlaps the selected one's (other regions first, then by closeness), each with date, place and region, plus `i još N`.
- **Poglavlja** (the episode's events):
  - Each row shows year(s), title, `N. place`, and a `▶ MM:SS` button that plays the mp3 from that timestamp.
  - A row expands to show the description, the transcript quote (serif italic with a gold left rule), actor chips, and confidence as text plus 3 dots.

---

## 11. Context: quiet others

When an episode is selected:

- **Selected:** full strength on every view (§9.1, §12.4, §7).
- **Every other matching episode in the current window:** muted. Map markers are 9 px at 60% opacity; timeline marks are at 40% opacity with labels in `--tx2` (the text stays readable; only the mark fades).
- **Outside the window:** stays at its out-of-window treatment.

Nothing is hidden by selection; only filters hide.

There are no other context modes.

---

## 12. Timeline

The baseline uses vis-timeline with event items. The final design shows **episodes**. You can keep vis-timeline if it can be styled and configured to match the spec below; that's your call. Items, rows, labels and the window behaviour below are the requirement.

### 12.1 Structure (top to bottom)

1. **Header row:**
   `VREMENSKA OSA` · `Pusti` · `120 god/s` · `Prevuci prozor ispod ose` · `<b>161</b> / 178 epizoda` · **`1023–2050`** (`--gold-hi`, 600) … right-aligned: `−` `+` `Ceo period` `[S|M|L]`.
2. **Era band** (26 px): one segment per era in view, 3 px left border in the era colour, serif italic 13/500 label. Clicking a segment zooms to that era.
3. **Axis** (23 px): ticks adapt to the zoom level. The step is the first of `1,2,5,10,20,25,50,100,200,250,500,1000` that gives ≥ 70 px; every 5th tick is major (`--tx`, 500). BC years: `431. p.n.e.` / `431 BC`.
4. **Rows:** a 132 px label column + track; scrolls vertically (§12.7).
5. **Overview strip with the Window** (§12.6).

There is **one** date-range display: the gold range next to the hint. The baseline's separate range readout is removed.

### 12.2 Window behaviour (horizontal: through history)

- The window defines the active period. **Map, list states, counts and the header info all follow the window on every frame while dragging.**
- **Drag the window body** to move it, **drag the side handles** to resize it (minimum span 8 years), or **click the strip outside the window** to centre the window there (360 ms tween).
- `−` / `+` zoom the window around its centre (factor 0.6), `Ceo period` resets to the full extent, and an era band click zooms to that era. All of these use a 480–520 ms `easeInOutCubic` tween.
- **On selection:** if the window is wider than 700 years, or the episode is longer than 80% of the window, the window becomes `max(3 × episode span, 320 years)` centred on the episode's anchor. Otherwise it only recentres if the episode is within 10% of an edge.
- A **gold band** marks the selected episode's span across all rows. If the selected episode is off-screen, an **edge pill** (`‹ Title 1389` / `Title 1389 ›`) appears in its row; clicking it brings it into view.
- **Full extent:** `[floor((min from − pad)/10)·10, ceil((max to + pad)/10)·10]`, with `pad = min(40, max(10, 3% of the span))`.

### 12.3 Rows (6 region families)

| Row | Data regions |
|---|---|
| Balkan | Balkan |
| Zapadna Evropa | Zapadna Evropa, Severna Evropa i Atlantik |
| Srednja i Istočna Evropa | Srednja Evropa, Istočna Evropa |
| Mediteran i Bliski istok | Vizantija i Egejski svet, Osmansko carstvo, Bliski istok, Afrika |
| Azija | Azija |
| Amerike | Severna Amerika, Južna Amerika |

EN labels: Balkans, Western Europe, Central & Eastern Europe, Mediterranean & Near East, Asia, Americas.

- **Row label column:** name (13/500), `inWindow/total` (12, `--tx2`), and `+N još` / `Skupi` (12.5/600, `--gold-hi`) when the row overflows.
- **Lanes:** greedy first-fit on each item's pixel extent (mark + label). Packing priority: selected, then hovered, then normal, then muted, then out of window.
  - Up to **3 lanes** per row (2 on phone).
  - Overflowing items are drawn as small coloured tick marks in an extra 12 px strip; `+N još` expands the row.
  - The selected item always gets a lane.
- **Lane spacing by size:** S 24 px, M 30 px, L 40 px.

### 12.4 Items and labels

| Kind | Mark |
|---|---|
| `point` (≤ 1 year) | 12 px diamond (rotated square), era colour, 1 px ink ring |
| `range` | 14 px bar from `from` to `to + 1`, **solid era colour**, 1 px ink ring, 3 px radius |
| `long` (> 150 years) | 14 px bar, 1.5 px solid era-colour border, **fine hatch** inside: `repeating-linear-gradient(135deg, mix(c 55%, panel) 0 1px, mix(c 30%, panel) 1px 7px)` |

- **Label:** episode title, 13/500 `--tx`.
  - **Inside the bar** when the visible part of the bar is wider than `label + 18 px`. The label sticks to the bar's visible left edge (`max(barStart, 2px) + 8px`), so it never gets cut off at the axis edge.
  - Otherwise the label sits to the right of the mark.
  - Inside labels pick ink `#1B130D` or white per fill by luminance (≥ 4.5:1). On hatched long bars the label is `--tx` 600 with a 2–6 px `--f1` text halo.
  - The date (`1331–1355`) is shown after the title only for hover and selected items.
- **States:**
  - Hover: label `--gold-hi` + underline.
  - **Selected:** 2 px panel gap + 4 px `--gold-line` ring around the mark, bold `--gold-hi` label + date.
  - Muted: mark at 40%, label `--tx2`.
  - Outside the window: mark at 22%, label `--tx3` at 75%.

### 12.5 Timeline information (replaces the map bubble)

- Placed directly after the hint `Prevuci prozor ispod ose`:
  `· <b>{visible}</b> / {total} epizoda · {from}–{to}`.
  When all episodes are visible it reads `· <b>178</b> epizoda · …`.
- `visible` = episodes that match the filters and overlap the window.
- It updates **every frame** during window drag, playback and tweens. `aria-live="polite"`.

### 12.6 Overview strip (the Window control)

- 52 px tall, aligned with the track column. The track (30 px) is `--f2` with a 1 px `--line` border and a 6 px radius, and contains a **density histogram** of matching episodes (90 bins, bars `#B7A48A`).
- The area **outside** the window is dimmed (`rgba(221,209,190,.62)`).
- **Window:**
  - 2 px `--gold-line` border, `rgba(212,170,85,.22)` fill, 6 px radius, 1 px dark hairline.
  - A **three-line grip** in the centre and **two 10×26 px gold handles** on its edges. Cursors: `grab` / `grabbing` / `ew-resize`.
  - Hover: fill .32 + 4 px gold halo. While dragging: fill .40.
  - `role="slider"`, `aria-valuetext="1023–2050"`.
- Start / middle / end year labels below (11.5 px, `--tx2`).

### 12.7 Vertical scrolling (more episodes in the period)

This must be **visible without hovering** (macOS overlay scrollbars hide by default, so don't rely on the native scrollbar):

- **Custom rail:**
  - 10 px wide on the right edge of the rows area, track `#EADFCB` with a 1 px `#C9B48E` edge, thumb `#A07F4C` (hover / drag `#7E5E2C`).
  - Thumb height = `max(28px, visible/content ratio)`. Click to jump, drag to scroll. The native scrollbar is hidden.
  - Shown only when the rows overflow.
- **Fading edges:** 26 px gradients (`--f1` → transparent) at the top and/or bottom, shown only when there is content in that direction.
- **"More below" pill:** bottom-right of the rows.
  - `↓ Još {n} epizoda u ovom periodu — skroluj`, where `n` = items below the visible area. Clicking scrolls 80% of a page.
  - At the bottom it becomes `↑ Nazad na vrh`.
  - Style: `--f3` fill, 1.5 px `--gold-line` border, 13/600, 15 px radius.
- **Same scrollbar colour family in the left panel and card:** thin (8 px) scrollbars with the `#A07F4C` thumb.
- Mouse wheel over the rows scrolls vertically; it does not zoom.

### 12.8 Height S / M / L

The behaviour is the baseline's; only the default changes.

| Size | Height | Rows |
|---|---|---|
| S | ≤ 24% of the app height, **shrinks to fit its content** | lane 24 px |
| **M (default)** | 45% | lane 30 px |
| L | 70% | lane 40 px |

- Minimum 150 px.
- A segmented control at the right end of the header (`S|M|L`, 30×28 px, active = gold fill + dark text, `aria-pressed`, title `Niska / Srednja / Visoka osa`).
- **Double-click on the header** cycles the sizes (as in the baseline).
- Changing the size calls `map.invalidateSize()` and refits the map.
- **The default must be `m`** (the baseline uses `'s'` in `FilterContext.tsx`). Recalculate on window resize.

---

## 13. Playback (Pusti)

The **behaviour is the baseline's** `useTimelinePlayback.ts`, unchanged; only the styling changes.

- **Position:** first control after `VREMENSKA OSA`, followed by the speed button.
- **Play button:** label is a word, `Pusti` / `Pauza` (no ▶, which is reserved for audio).
  - Idle: `--f1` with a `--line` border. Playing: **gold fill**, `#1B130D` text.
  - `aria-pressed`, min-width 7ch.
- **Speed:** text button `120 god/s`; cycles `40 → 120 → 400` years per second.
- **Behaviour** (unchanged):
  - If the window is ≥ 90% of the full extent, or already at the end, playback restarts from the start (a 120-year window if it was full, otherwise the current width).
  - It advances every 100 ms (320 ms with reduced motion) by `speed × elapsed`, carrying fractional years.
  - If the next window contains no episode start year, it jumps so the next episode lands 20% into the window.
  - It stops at the end.
  - **Any pointer-down on the timeline area stops it** (axis, rows, window, rail).
- **Map, list and counts** follow the window as in §12.2. The **selected episode stays selected.**

---

## 14. Era colours (current system)

The colour is assigned **by era of the episode's `anchor` year**.

| Era (SR / EN) | Years | Colour | On panel `#F7F0E3` | On map `#F2EADB` | Label on fill |
|---|---|---|---|---|---|
| Antika / Antiquity | < 600 | `#8A6A9E` | 4.0:1 | 3.8:1 | white 4.5:1 |
| Srednji vek / Middle Ages | 600–1453 | `#3F7F8C` | 4.0:1 | 3.8:1 | white 4.5:1 |
| Rani novi vek / Early modern | 1453–1789 | `#6E8B3D` | 3.4:1 | 3.2:1 | ink 4.7:1 |
| Dugi 19. vek / Long 19th century | 1789–1914 | `#C08A2E` | 2.7:1 | 2.5:1 | ink 6.0:1 |
| 20. vek i posle / 20th century on | ≥ 1914 | `#B4553A` | 4.3:1 | 4.1:1 | white 4.9:1 |

- **One colour per episode, everywhere:**
  - map marker fill;
  - cluster ring segment;
  - list glyph;
  - era header swatch;
  - timeline mark;
  - era band border;
  - legend swatch;
  - card eyebrow dot;
  - "U isto vreme" dots;
  - overflow ticks.
- **Every coloured mark carries the ink ring** (`--ring`). This is what keeps the ochre era (2.5–2.7:1) above the 3:1 edge contrast on light surfaces. Don't remove it.
- **Selected** = ink/gold rings plus size and bold label; the fill colour does not change. **Muted** = lower mark opacity only; hue unchanged.
- **Many episodes:** five colours scale to any count; clusters show the mix as a conic ring.
- Region colours are **not** used for episodes. The baseline's 12-hue `REGION_COLORS` is replaced on the map and timeline by era colours; regions remain only as filters and timeline rows.

---

## 15. Accessibility and readability requirements

| Item | Requirement |
|---|---|
| Text contrast | Primary ≥ 15:1, secondary ≥ 9:1, tertiary/metadata ≥ 5.4:1 on every surface, using the tokens in §3. **Faded states never fade text with opacity**: the mark fades and the label switches to `--tx2` / `--tx3`. |
| Gold | Never use `--gold` `#D4AA55` as text or a thin line on light surfaces. Use `--gold-hi` for text and `--gold-line` for lines. |
| Sizes and weights | Body 14 px · list title 14.5/500 · metadata 12.5 · section labels 11.5/600, tracked uppercase · chips 13/500, 30 px high · buttons 14/600, 40 px (36 px in the filter footer) · timeline labels 13/500, axis 12 · card title 27 serif 600 · guide body 14–14.5 |
| Selected states | Never colour-only: list (gold outline + bold + bg), timeline (ring + bold + date + span band), map (size + ink ring + label), chips (check mark + fill + bold), S/M/L and SR/EN (gold fill), play (fill + word change) |
| Disabled | Readable `--tx3` text, dashed border, `disabled` attribute and a title explaining why. No 45% opacity. |
| Data marks | 1 px ink ring on markers, swatches, glyphs and bars; 1.5 px paper + ink ring on map markers |
| Focus | Visible `:focus-visible` gold outline on all controls; the filter panel and guide manage focus; markers are keyboard-focusable (Leaflet `keyboard: true`) |
| Motion | `prefers-reduced-motion`: transitions and animations ~1 ms; playback uses the 320 ms step (baseline behaviour) |
| Language | SR/EN toggle covers all UI strings; region rows and filter labels have EN names. Episode titles fall back to SR when there's no EN title. |

---

## 16. First-use guide (current panel)

- **When:** automatically **~700 ms after the first load**, once per browser (`localStorage` key `hcm-guide-v1 = '1'` when finished or closed; wrap the access in try/catch). Not on the phone layout. Closes any open filter panel and expands a collapsed left panel first.
- **Overlay:**
  - A full-screen layer blocks the interface.
  - The **spotlight** is a rounded rectangle (10 px) around the target with `box-shadow: 0 0 0 3px #FFF8EC, 0 0 0 6px var(--gold-line), 0 0 0 9999px rgba(33,23,15,.58)`. This both dims the rest and outlines the target.
  - It moves smoothly between steps (420 ms).
- **Card:** same language as the episode card:
  - `--f1` surface, 1 px `--line` border, 10 px radius, card shadow, a 14 px arrow pointing at the target;
  - eyebrow `KORAK 1 OD 2` (11.5/600 tracked, `--tx2`), × close, title serif 21/600, body 14.5/1.5 `--tx`.
- **Step 1, filters:**
  - Spotlights the filter button; the card sits to its right.
  - *Filtriraj epizode*: "Ovde suzi izbor epizoda po zbirci, serijalu, regionu ili vrsti događaja. Broj na ikonici pokazuje koliko je filtera uključeno."
  - Buttons: `Preskoči` (link) · `Dalje →` (primary).
- **Step 2, timeline:**
  - Spotlights the whole timeline; the card sits above it, pointing down.
  - Two **numbered gold tags** sit on the interface:
    - **① ↔** above the window, which also gets a pulsing dashed `--gold-line` outline;
    - **② ↕** next to the vertical rail, which also gets a pulsing outline.
  - Card *Vremenska osa ima dva smera*, with two rows matching the tags:
    - **① ↔ Vodoravno — kroz istoriju:** "Prevuci zlatni prozor ispod ose (ili njegove ivice) da pomeriš i suziš period."
    - **② ↕ Uspravno — više epizoda u periodu:** "Skroluj osu nadole ili prevuci traku desno da vidiš sve epizode izabranog perioda."
  - Buttons: `← Korak 1` · `Razumem` (primary).
- **Controls:** × or `Esc` closes at any step; focus is trapped in the card with the primary button focused; the overlay re-positions on resize. Nothing remains after closing.
- **EN strings:** *Filter episodes* / *The timeline works in two directions* / *Horizontal — move through history* / *Vertical — more episodes in the period* / Next / Skip / Got it.

---

## 17. Hover and sync

Hovering an episode in **any** view highlights it in the other two:

- list row background;
- map marker enlarges and shows its label (or the containing cluster scales up);
- timeline label turns `--gold-hi` and underlined.

---

## 18. Animations and transitions

| Element | Timing |
|---|---|
| Map flyTo on selection | 0.85 s |
| Timeline window tweens (select, zoom, era, reset) | 480–560 ms `easeInOutCubic` |
| Left panel collapse / expand | 420 ms on grid columns + panel fade/slide; the floating control fades in with a 180 ms delay |
| Episode card in/out | 420 ms translateX; content swap 150 ms fade |
| Marker state changes | 260 ms size/opacity; selection pulse 900 ms, once |
| Filter panel open | 260 ms slide-down + fade |
| Guide spotlight move | 420 ms |

Timing curve `cubic-bezier(.3,.7,.2,1)` unless noted. Everything respects `prefers-reduced-motion`.

---

## 19. Responsive / phone (< 720 px app width)

- **Top bar:** HC mark, "HistoryCast Mapa" (the word "Mapa" in `--gold-hi`), and a search button that opens the left panel as a **full-screen sheet** (slides up). Selecting an episode closes the sheet.
- **Map** fills the middle. **Timeline** has a fixed 210 px height.
- **Hidden on phone:**
  - timeline: S/M/L, the speed button, `−` / `+`, and the hint;
  - the left panel's collapse control;
  - the map legend.

  Row labels overlay the track.
- **Episode card** becomes a bottom sheet (72% of the map height) with a grab handle that toggles a 118 px peek.
- **Filter panel** opens as a sheet over the list.
- **The first-use guide is not shown on phone.**

---

## 20. Strings that changed (SR / EN)

| Key | SR | EN |
|---|---|---|
| Search placeholder | Epizode, ličnosti, mesta, godine… | Episodes, people, places, years… |
| Count | {n} epizoda · {n} / {t} epizoda | {n} episodes · {n} / {t} episodes |
| Timeline hint | Prevuci prozor ispod ose | Drag the window below the axis |
| More below | Još {n} epizoda u ovom periodu — skroluj · Nazad na vrh | {n} more episodes in this period — scroll · Back to top |
| Filter groups | Zbirke · Serijal · Region · Vrsta događaja u epizodi | Collections · Series · Region · Event type in episode |
| Filter footer | Poništi sve · Gotovo · {n} epizoda | Clear all · Done · {n} episodes |
| Unavailable option | Nije dostupno uz izabrane filtere | Not available with the selected filters |
| Empty (filters) | Nijedna epizoda ne odgovara filterima. | No episodes match the filters. |
| Empty (period) | U ovom periodu nema epizoda. Najbliža: … | No episodes in this period. Nearest: … |
| Playback | Pusti · Pauza · {n} god/s | Play · Pause · {n} yr/s |
| Size titles | Niska / Srednja / Visoka osa | Short / Medium / Tall timeline |

---

## 21. Preserve: what not to rebuild

- **Stack:** React + TypeScript + Vite, Leaflet, vis-timeline (if it meets §12), GitHub Pages build.
- **Data pipeline:** `geo-events.json`, the schema, fragments, the validator, `fetch-episodes`; `config/collections.ts` as the source of collections.
- **Playback** logic (`useTimelinePlayback.ts`), unchanged.
- **Audio:** deep-link `audioUrl#t=`, the inline player, and its loading/error states.
- **SR/EN i18n** structure; region EN names (`REGION_EN`).
- **URL state** (`e`, `ep`, `col`, `r`, `ty`, `se`, `from`, `to`, `lang`): keep shareable URLs and map them to the new state. `col`/`r`/`ty`/`se` become filter values; `e`/`ep` select an episode; `from`/`to` set the window.
- **Fixes already in the baseline:** B1 (`rtl:false`), B6 (selection never clustered), B7 (active filters always visible), and B8 (redraw on window change).
- **Not in the prototype, but in the baseline — confirm with the product owner before removing:**

  | Behaviour | Baseline | Prototype |
  |---|---|---|
  | Click on empty map | Deselects | Only closes the cluster list |
  | Refit map on filter / collection change | Yes | No; refits on S/M/L and "Prikaži sve" |
  | Copy link to the current view | Sidebar button | Copy icon in the episode card |

---

## 22. Implementation checklist

### Must change

- [ ] Light HistoryCast tokens (§3); no theme switcher; Plex Sans + Newsreader
- [ ] Derive episode-level period / kind / anchor / place / regions / types (§1)
- [ ] **One map marker per episode**, era-coloured, with the state styles and ink ring (§9.1)
- [ ] Episode clusters with an era conic ring; selected and out-of-window markers excluded; cluster list popover
- [ ] Era colours (§14) used identically in the map, list, timeline, legend and card
- [ ] Left panel structure (§4): search + filter button, chip row, count, era-grouped list; remove the Zbirke section, "Sve epizode" row, inline facets, stats block and sort tabs
- [ ] Collapsible left panel + floating control (§2)
- [ ] Extended search (§5)
- [ ] Filter panel that **expands down over the list**, instant, with a badge (§6.1–6.3)
- [ ] Zbirke as the first filter group (multi-select)
- [ ] Episode-based chip counts + **dependent disabled options** (§6.4)
- [ ] `Poništi sve` clears **all** groups, including Zbirke
- [ ] Filtered-out episodes **hidden** in the list, map and timeline; empty rows removed (§6.5)
- [ ] Count `178 epizoda` / `12 / 178 epizoda` (§8)
- [ ] Selection keeps context (quiet others, §11) instead of filtering to the episode
- [ ] Docked episode card replaces the Leaflet popup (§10.2), including chapters, Mesto u istoriji and U isto vreme
- [ ] Map status bubble removed; timeline info line next to the hint (§12.5)
- [ ] Timeline items = episodes; diamond / solid bar / fine-hatched long bar; sticky in-bar labels (§12.4)
- [ ] 6 region rows, 3-lane cap, `+N još`, overflow ticks, edge pill, gold span band (§12.3)
- [ ] Era band + adaptive axis (§12.1)
- [ ] Overview strip + Window control with histogram, dimming, grip and handles (§12.6)
- [ ] Vertical rail + fades + "Još N epizoda" pill; warm scrollbars (§12.7)
- [ ] S/M/L with **M as default** (`FilterContext.tsx`: `useState<TimelineSize>('m')`); lane spacing per size (§12.8)
- [ ] Play/speed restyled (§13)
- [ ] Hover sync across all three views (§17)
- [ ] Readability rules (§15)
- [ ] First-use guide, two steps (§16)
- [ ] Phone layout (§19)

### Preserve

- [ ] Leaflet map, tile/basemap setup (re-tinted toward §9 if possible), keyboard focus on markers
- [ ] Data model, pipeline, validator, `collections.ts`
- [ ] `useTimelinePlayback` behaviour
- [ ] Audio deep links and player states
- [ ] URL params (remapped)
- [ ] SR/EN

### Verify

- [ ] Timeline opens at **M** on first load (also after a reload and at different window heights)
- [ ] S shrinks to its content; M = 45%; L = 70%; double-click on the header cycles; the map refits
- [ ] Dragging, resizing and click-to-centre on the Window update the map, list states, era-header counts, row counts and the info line **live**
- [ ] The vertical rail, fades and "Još N" pill appear only when rows overflow; the count is correct; "Nazad na vrh" works
- [ ] Selecting from the list, map, cluster list, timeline, card links and ←/→ gives identical results in all three views
- [ ] Quiet others: the others are muted, not hidden; labels stay readable
- [ ] Filters: instant; badge count; chip counts; `Srpski srednji vek` disables incompatible options; removing it re-enables them; `Poništi sve` clears Zbirke too
- [ ] Hidden filtered episodes in all views; empty-state messages and their clear actions
- [ ] Count text in both languages
- [ ] Play/Pause from full extent, mid-range and the end; a press on the timeline stops it; selection is kept
- [ ] Era colours identical across views; ink rings present; the ochre era is visible on the map
- [ ] Contrast: spot-check the §3 pairs; no gold text or thin lines in `#D4AA55`; disabled chips readable
- [ ] Guide: appears once; × and `Esc` work; never on phone; spotlight positions after resize; nothing left behind
- [ ] Phone: sheets, card peek, hidden controls
- [ ] `prefers-reduced-motion`
