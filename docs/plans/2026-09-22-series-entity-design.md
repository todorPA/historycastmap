# Series as a first-class entity

**Date:** 2026-09-22
**Status:** designed, not implemented

## Problem

`Episode` is flat — `id`, `title`, `pubDate`, `audioUrl`, `color`. Nothing records that
*Prvi srpski kralj* and *HistoryCast nedeljom — Žiča* belong to different shows. HistoryCast
runs a twice-weekly thematic slot (*četvrtkom* on Thursdays, *nedeljom* on Sundays) alongside
the numbered main show, and the map currently flattens the two together.

The feed, at 184 episodes: 145 main numbered, 22 *nedeljom*, 5 *četvrtkom*, 5 *specijal*,
7 unbranded one-offs.

## Decisions

**Two series, not three.** `main` and `side`. *Četvrtkom* and *nedeljom* are one twice-a-week
slot, not two shows. *Specijal* and the unbranded one-offs are `main` — they are occasional
main-show episodes, not a recurring series.

**Branding wins over numbering.** Series membership is orthogonal to episode numbering in the
feed: `115 = Vuk Karadžić | HistoryCast nedeljom` is both numbered and branded. Publication
day does not settle it either — of the 27 branded episodes only 15 published on a Sunday. When
the two signals disagree, the branding in the title decides. So 115 becomes `side` and leaves
the main show.

## 1. Deriving `series`

`Episode` gains one optional field:

```ts
export type SeriesId = 'main' | 'side';

export interface Episode {
  id: string;
  title: LocalizedText;
  series?: SeriesId;   // absent = 'main'
  …
}
```

Derived at merge time in `scripts/merge-fragments.mjs` from the feed title, **not** authored in
fragments. The script already parses each title to extract the episode number; the same pass
tests for `/nedeljom|četvrtkom/i` and stamps `series: 'side'`. Everything else is `'main'`.

Three reasons this beats a fragment field: it costs Enchanté nothing, it applies retroactively
to all 102 existing fragments with no re-extraction, and the feed title is the actual source of
truth for which show an episode belongs to. `docs/enchante-fragment-brief.md` stays valid
unchanged.

Because series is now displayed separately, the merge also strips branding from the display
title:

| Feed title | Title | Series |
|---|---|---|
| `HistoryCast četvrtkom - Žiča` | Žiča | side |
| `115 = Vuk Karadžić \| HistoryCast nedeljom` | Vuk Karadžić | side |
| `95 - Kosovska bitka, HistoryCast specijal` | Kosovska bitka, HistoryCast specijal | main |

Absent means `'main'`, so the field is backward-compatible: `geo-events.sample.json` and any
older dataset keep validating and rendering. `scripts/validate-data.mjs` gains one check —
`series`, if present, must be `main` or `side`.

## 2. The filter

A third facet, not a new kind of control. A chip group is the idiom the sidebar already uses
for region and type, and inventing a segmented toggle for this would undo the consolidation in
`a88a0e5 design: one control system`.

`FilterContext` gains `activeSeries: SeriesId[]` and `toggleSeries`, mirroring `activeRegions`
and `activeTypes`: empty means no restriction, OR within the facet, AND across facets.
`clearFacets` clears it; `UrlSync` carries it as `?series=`.

One structural difference: region and type live on the event, series lives on the episode. So
visibility needs a lookup rather than a field read. `DataContext` builds
`sideEpisodeIds: ReadonlySet<string>` once at load and `VisibilityFilters` carries it — the
same shape `activeCollectionEpisodes` already uses. `isVisible` gains one line:

```ts
if (activeSeries.length > 0 && !activeSeries.includes(seriesOf(event.episodeId))) return false;
```

In the sidebar the group goes first, above Region, with the counts-ignore-own-facet logic the
other facets use, so a chip shows what picking it would yield rather than what is left after it.

New i18n keys:

| Key | sr | en |
|---|---|---|
| `series` | Serijal | Series |
| `series_main` | Glavna serija | Main show |
| `series_side` | Tematske epizode | Thematic episodes |

## 3. Visual distinction

Every channel on a map dot is already spoken for: fill is region, dashed ring plus reduced
opacity is low confidence, ring weight is selection, radius is cluster count. Series needs a
free channel, not a borrowed one.

**A centre pip.** A side-series dot gets a second small `CircleMarker` stacked at the same
position — radius 2.5, ink fill (`#1a1713`), `interactive: false` so clicks fall through to the
dot beneath. It composes with every existing state: a low-confidence side-series dot still
dashes, a selected one still thickens.

Clusters get the pip only when every member is side-series. A pip that sometimes means "all of
these" and sometimes "some of these" says nothing.

Two alternatives were rejected. **Square markers** are the clearest signal, but `CircleMarker`
cannot do it — it means moving to `divIcon` and rewriting marker rendering, the clustering refs
and the popup-reopen logic, which is disproportionate risk for a distinction that currently
applies to one episode. **Muted fill** is nearly free but collides with low confidence, which
already means "faded"; two meanings on one channel is how a legend stops being readable.

On the timeline, items gain `vis-item--side` alongside the existing `vis-item--low`, styled as a
3px ink notch on the left edge. `Legend.tsx` gains one row for the pip.

## Sequencing

Section 3 decorates exactly 5 events until the backlog lands, so §1 and §2 can ship on their own
and §3 can follow. That split is still open.

## What this ships with

**Updated 2026-09-24:** the backlog has landed. 178 episodes, 741 events, 283 places —
**27 side-series episodes carrying 80 events**, against 151 main-show episodes. The
"nearly empty at launch" caveat below no longer applies, and §3 is now worth building: the
series chip group has real content on both sides, and the centre pip marks 80 events rather
than 5.

One transcript is unconverted — episode 49, *Stefan Uroš I*, logged in `fragments/SKIPPED.md`.

The numeral-collision episodes (05, 06) were disambiguated with slug ids as this document
recommended, and the `đ` slug bug found during that work is fixed in `slugify()` — see
`docs/enchante-fragment-brief.md` §1.

Only one side-series episode currently has events: **115, with 5 events of 456**. The feature is
nearly empty at launch and fills in as Enchanté works through the 27-episode side-series backlog
(see `docs/enchante-fragment-brief.md`).

Note for that backlog: the feed reuses numbers 5 and 6 across the main show and the side series
(`05 - Istorija lala | HistoryCast četvrtkom` vs `05 - Istorija jugoslovenskog filma, 2. deo`).
Neither number is in the dataset today, but side-series fragments should use the slug id form so
the two cannot collide.
