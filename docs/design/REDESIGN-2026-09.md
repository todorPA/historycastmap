# HistoryCast Map: redesign, September 2026

Status of the visual redesign carried out on branch `feat/stress-ready-map`,
commits `c4f69b1`..`dca11f9`, plus the B1 timeline fix in `7f4ff68`. Written in
English to match the code comments; the older `DESIGN-BRIEF.md` (Serbian)
describes the pre-redesign state and is still the reference for *what the product
is*.

Two deliverables were requested: an overhaul of the explorer's visual language,
and a landing page in front of it, with a new palette and type system proposed
before any code was written.

---

## 1. Design read

The project is two products with one token layer.

| | Explorer (`/app.html`) | Landing (`/`) |
|---|---|---|
| Kind | dense cartographic product UI | editorial archive page |
| Audience | listeners placing the podcast in space | first-time visitors |
| Variance / motion / density | 3 / 3 / 7 | 7 / 5 / 3 |
| Display face | none (sans only) | EB Garamond |

The explorer is a cockpit, so it wants symmetry and density, not asymmetric
drama. The landing page is a cover. Both are dark, so the theme holds across the
whole site.

A note on method: the anti-slop frontend skill used for this work is scoped to
landing pages and portfolios, and explicitly excludes dense product UI. Its
layout machinery was therefore applied only to the landing page. What transferred
to the explorer was its audit-first redesign protocol, the consistency locks
(one accent, one radius scale), interaction-state completeness, and the
accessibility guardrails.

---

## 2. Audit of the pre-redesign state

**What was already right.** `app.css` had a real token layer, a single accent, and
a deliberate dark-chrome-over-light-map split. No AI-purple, no glassmorphism, no
hand-rolled SVG icons. `font-variant-numeric: tabular-nums` was already applied
to years and counts. `config/regions.ts` carried a genuinely good argument for
colouring by region rather than episode. This was a competent system that had
aged, not a broken one.

**Three real problems, in severity order.**

1. **The UI accent collided with a data colour.** `--accent: #d9a13b` sat between
   the `Bliski istok` region hue (`#b7791f`) and `.badge--medium` (`#b7791f`). In
   a map application colour *is* the data encoding, so an amber "active episode"
   border and an amber "Near East" marker meant two unrelated things in one hue.

2. **The twelve region hues were the Flat UI 2013 palette** and were not
   perceptually spaced. See §4.

3. **Type was the system stack, doing no work.**

**Not a problem, despite appearances.** The dark-chrome / light-popup split looks
like a theme-lock violation but is not: light popups sit on a light basemap,
which is the correct convention for a map application. Kept, with its tokens
tightened.

---

## 3. Colour: the chrome spends no hue

Twelve regions carry twelve hues, so everything around them is now achromatic: a
single cool neutral ramp (`--ink-900` .. `--ink-100`) plus `--paper` for active,
selected and focused states. Emphasis is carried by lightness and weight.

This was the principled fix for problem 1 rather than "pick a different accent":
every hue available to an accent collides with one of twelve regions. Spending
zero hue on chrome means an active episode can never be misread as a region, and
it cannot regress as regions are added.

Selection is paper-white rather than a reserved chromatic pop. The markers
already used a white ring for selection, so this was both the smaller change and
the more consistent one.

Stray colour removed along the way: the blue Play button (`#1f6feb`) and the
amber active states on the language and basemap toggles.

---

## 4. Colour: the region palette was solved, not picked

The old palette's real defect was measurable, not stylistic. Converting each hue
to CIELAB after simulating dichromacy, the closest pair in the set was:

| Vision | Worst pair | ΔE before | ΔE after |
|---|---|---|---|
| normal | (varies) | 16.3 | **21.5** |
| deuteranopia | Zapadna Evropa / Bliski istok | **2.9** | **12.2** |
| protanopia | Zapadna Evropa / Bliski istok | 8.4 | 11.8 |
| tritanopia | Zapadna Evropa / Bliski istok | **3.6** | **10.8** |

At ΔE 2.9 those two regions were, for a deuteranope reader, one colour. The map
was claiming a distinction it did not deliver.

The replacement was optimised against exactly that failure: one hue per
30-degree band, so the circle stays complete and region colour keeps its
intuition (Balkan warm, Azija violet), with lightness and chroma searched inside
each band to maximise the *worst-case* pair distance across normal, deuteranope,
protanope and tritanope vision simultaneously.

**A design decision this forced.** No single hex clears 3:1 against both the
light basemap (`#dfe4e8`) and the dark sidebar (`#161b21`). The two surfaces
pull in opposite directions. Rather than compromise the hues, every marker,
legend swatch, chip dot and popup dot now carries an outline. Legibility comes
from the ring; the fill is free to be chosen purely for mutual
distinguishability. This is why `regions.ts` warns that editing a value without
re-running the optimisation will quietly reintroduce a collision.

---

## 5. Type

**IBM Plex Sans + IBM Plex Mono**, self-hosted, for the explorer and landing body.
**EB Garamond** for landing display only.

Chosen on a constraint verified in the data rather than on taste: the dataset is
Serbian Latin with the full `č ć š ž đ` set plus a few Cyrillic strings. That
requires Latin Extended-A and ideally Cyrillic coverage, which rules out most of
the fashionable faces (Satoshi, Cabinet Grotesk) on glyph coverage alone. Both
Plex faces ship both subsets under OFL. The mono sibling supplies real tabular
numerals for years, BC/AD and `MM:SS` timestamps instead of borrowing digits
from a sans.

Serif is wrong for the explorer chrome and is not used there. On the landing page
the brief is genuinely publication/heritage, and EB Garamond carries both
required subsets.

Fonts are **not a build dependency**. `npm run fonts` fetches nine woff2 files
into `public/fonts/` (gitignored, split latin-ext / cyrillic so a reader who never
hits a Cyrillic glyph never downloads that subset). When absent, the stacks fall
through to the system sans and the app runs normally.

---

## 6. What was implemented

### `c4f69b1`: token layer and fonts
- `src/styles/tokens.css` (new): neutral ramp, light-surface tokens, type scale,
  one radius scale, spacing scale, documented z-index scale, global
  `prefers-reduced-motion` reset.
- `src/styles/fonts.css` (new): nine `@font-face` rules, `font-display: swap`,
  honest `unicode-range` per subset.
- `scripts/fetch-fonts.mjs` (new) + `npm run fonts`; `public/fonts/` gitignored.

### `cd394c8`: region palette
- `src/config/regions.ts`: twelve new hues, with the optimisation and its
  measured results documented in the file so the constraint travels with the data.
- `src/components/EventMarkers.tsx`: dark ring on single markers and clusters;
  selection ring moves to paper-white.

### `1e9ad45`: explorer chrome
- `src/styles/app.css`: mapped onto the tokens; mono numerals wherever a number
  is read as a quantity; stray blue and amber removed.
- **Added what was missing**, not only restyled what existed: one keyboard-only
  `:focus-visible` treatment across every interactive control, button hover, and
  a tactile `:active` press.
- `src/lib/i18n.ts`: em-dashes in the two OpenHistoricalMap notes replaced with
  colons (user-visible UI strings, not comments).

### `dca11f9`: landing page
- Two-page Vite build via `rollupOptions.input`. **No router added**: the explorer
  is unchanged and still mounts from `src/main.tsx`, it just has its own entry
  (`app.html`).
- `index.html` + `src/styles/landing.css` (new): shares the token layer so the two
  surfaces cannot drift, but runs a different register.
- Six content blocks (hero plus five sections), four distinct layout families,
  one eyebrow on the page.
- **Real screenshots**, not stock imagery and not a mocked-up product shot:
  `public/img/{explorer,regions,timeline}.jpg`, captured from the running app
  against the full dataset.
- Copy is Serbian; every number is read off the dataset (456 events, 102
  episodes, 204 places, 1200 BC to 2006).
- Entrance reveals use `IntersectionObserver`, never a scroll listener. The hidden
  state is armed by a `.js` class, so if the script never runs the content is
  simply visible. `prefers-reduced-motion` collapses it to static.
- `public/favicon.svg` (new).

---

## 7. Verification performed

Evidence, not assertions:

- **Contrast:** all 18 text/background pairs introduced measured against WCAG AA.
  Lowest is muted text on the sidebar at 4.86:1 (needs 4.5). Confidence badges on
  the light popup surface: 5.35 / 5.37 / 6.51.
- **Both pages driven in a real browser** (headless Chrome over CDP) at desktop
  1440px and mobile 390px. Mobile collapses to a single column as intended.
- **Production build served under the `/historycastmap/` base:** no broken assets,
  all font subsets resolve, and the Cyrillic subset loads only on the page that
  needs it.
- **Explorer behaviour exercised** on the full dataset: EN/SR toggle, marker
  click, event popup (title, meta, confidence badge, actor chips, quote, Play
  button), legend, facet chips.
- `npm run build` and `npm run validate:full` both pass.

---

## 8. Bugs noticed

### B1. Timeline rendered invisible, not empty. FIXED in `7f4ff68`
**Pre-existing; not introduced by this work.** Confirmed by stashing the entire
redesign and reproducing on a clean `65f7738` checkout.

**Reported as:** loading `?data=full&from=700&to=1500` leaves the timeline panel
body blank while the map, legend, facet counts and the "86 of 456" stat all update
correctly.

**Two things about that description turned out to be wrong.** The panel was never
empty: items, groups and axis were all in the DOM with correct geometry, and the
entire vis root was sitting at `visibility: hidden`. And it was not specific to a
URL range. The default sample dataset was invisible too. The full dataset was
visible only by luck, which is what made it look dataset-dependent.

**Root cause.** vis hides its own root in the constructor whenever `options.rtl` is
absent, so it can sniff text direction off the DOM without a flash, and restores it
from the `changed` handler behind this guard:

```js
!initialDrawDone && (initialRangeChangeDone || (!options.start && !options.end) || rollingMode)
```

We pass `start`/`end` as `Date` objects, which are always truthy, so the second
escape can never fire. That leaves `initialRangeChangeDone`, set only when a
`rangechanged` event actually fires. When the initial window already equals the
start/end requested, nothing changes the range, no event is emitted, and the
timeline stays invisible permanently. The full dataset happened to have its window
adjusted on mount, emitted `rangechanged`, and became visible by accident.

**Fix.** Declare `rtl: false` so the constructor never enters that branch. The app
has no RTL support to detect, so stating the direction is honest rather than a
workaround.

**Second defect found while measuring the first.** `orientation` was passed as
`{ axis: 'top' }`, leaving `orientation.item` undefined. vis treats anything that
isn't `'top'` as bottom-anchored and, in `_updateScrollTop`, shifts scrollTop by the
full delta on every increase in content height to hold items still against a bottom
axis. With groups taller than the panel this opened the timeline scrolled to the end
of the stack: measured 4253px down, showing its last regions instead of Balkan. Now
passes both keys.

**Verified** across five mount states (sample and full, each with and without a URL
range, plus a narrow range): root visible, internal scroll at the top of the stack,
items inside the viewport, axis labelled. Reset-to-full-period, timeline item
selection syncing to the map popup, the size cycle and the episode filter all still
work, with no runtime exceptions.

### B2. Sample dataset uses region names outside the canonical twelve
`geo-events.sample.json` contains `Vizantija`, `Srpsko carstvo`, `Srbija`,
`Skandinavski svet` and `Britanija`, none of which are keys in `REGION_COLORS`,
so those markers fall back to `UNKNOWN_REGION_COLOR` grey. The full dataset is
clean (validator reports exactly 12 regions). Cosmetic, but the sample is the
default dataset, so a first-time visitor to `/app.html` sees more grey than they
should.

### B3. Five places in the full dataset have no events
Reported as a warning by `validate:full`: `rems-remis`, `herson-krim`,
`norveska`, `lisabon`, `concord`. Upstream data question, listed for
completeness.

### B4. Commits are unsigned
`commit.gpgsign` is `true` in this repo and the signing prompt cannot be answered
from a non-interactive shell; the first attempt hung for fifteen minutes. All
four commits were made with `-c commit.gpgsign=false`. To sign before pushing:

```
git rebase --exec 'git commit --amend --no-edit -S' HEAD~4
```

### B5. Explorer JS bundle is 964 kB (287 kB gzipped)
Pre-existing, flagged by Vite on every build. `vis-timeline` and `leaflet`
dominate. Not touched here; would want `manualChunks` or a dynamic import of the
timeline.

---

## 9. What is left

### Needs a decision from Milan
- **Review the region hues on a real display.** They were optimised numerically
  and checked in a browser, but twelve colours are a judgement call and this is
  the one change that alters how the product's data reads.
- **`PLAN.md` does not mention a landing page.** It is not in any of the four
  phases, and `CLAUDE.md` says to stop after Phase 1 and report. The page is
  built; the plan should record it, or the scope should be rolled back.
- **`DESIGN-BRIEF.md` now describes the old visual language.** Either update it or
  mark it historical and point at this document.

### Follow-up work, in rough priority order
1. Reconcile **B2**: either extend the sample data to canonical region names or
   regenerate the sample from the full dataset. Now the top item, because with B1
   fixed the sample dataset is what a first-time visitor actually sees.
2. **Screenshots will go stale.** `public/img/*.jpg` were captured by hand from a
   running dev server. Worth a small script so they can be regenerated after any
   future visual change.
3. **Landing page i18n.** The explorer is bilingual; the landing page is Serbian
   only. An EN variant needs either a second static page or a small amount of
   shared vocabulary.
4. **Empty and error states on the landing page** are not applicable, but the
   explorer's loading and error screens were only retokened, not redesigned.
   A skeleton matching the final layout would be better than the current
   centred text.
5. **`prefers-reduced-transparency`** fallback for the `backdrop-filter` panels
   (legend, basemap switcher, nav).
6. **Lighthouse pass.** Core Web Vitals were reasoned about (fonts preloaded via
   `swap`, images carry intrinsic `width`/`height` so CLS is bounded, hero image
   is `fetchpriority="high"`) but not measured.
7. **B5** bundle splitting.

### Explicitly not done
- Phase 2 OHM historical basemap. Untouched; the basemap switcher and its config
  indirection still work as `SPEC-ohm.md` specifies.
- Any change to the data model, `geo-events.schema.json`, URL parameter names,
  route slugs the explorer already answered to, or the information architecture
  of the sidebar.
