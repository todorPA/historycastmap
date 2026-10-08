import { useEffect, useMemo, useRef, useState } from 'react';
import { useEpisodes, useMatchingEpisodes } from '../../state/DataContext';
import { TIMELINE_SIZES, useFilters } from '../../state/FilterContext';
import { pick, t, type UiKey } from '../../lib/i18n';
import { formatYear } from '../../lib/time';
import { episodeNoun } from '../../lib/plural';
import { episodeDate } from '../../lib/panelModel';
import { markerState } from '../../lib/episodeMarkers';
import { overlaps } from '../../lib/episodeVisibility';
import { scrollBehavior } from '../../lib/motion';
import { axisTicks, eraSegments, yearToX } from '../../lib/timelineAxis';
import { buildRows, LANE_PX } from '../../lib/timelineLayout';
import { histogram } from '../../lib/timelineStrip';
import { centreView, eraView, selectionView, zoomView } from '../../lib/timelineWindow';
import { useTimelinePlayback } from '../useTimelinePlayback';
import { measureLabel, useFontsReady } from './measureText';
import { useTimelineView } from './useTimelineView';
import TimelineRows, { type FocusBand } from './TimelineRows';
import TimelineStrip from './TimelineStrip';
import TimelineRail from './TimelineRail';

/** Label column and the rail's gutter, in px; the axis, era band and strip line up with them. */
const LABEL_COL = 132;
const RAIL_GUTTER = 16;
/** Lanes per row before the rest become overflow ticks (2 on phone, Phase 5). */
const LANE_CAP = 3;
const ZOOM_STEP = 0.6;

/**
 * The episode timeline (HANDOFF §12–§13). Horizontal is history — the Window on the strip below
 * the axis is the active period, and everything else follows it on every frame. Vertical is more
 * episodes in that period — rows scroll, with a visible rail and a count of what is below.
 */
export default function Timeline() {
  const episodes = useEpisodes();
  const matching = useMatchingEpisodes();
  const {
    lang, selectedEpisodeId, hoveredEpisodeId, selectEpisode, setHoveredEpisodeId,
    timelineSize, setTimelineSize, cycleTimelineSize,
  } = useFilters();
  const { view, viewRef, bounds, commit, tweenTo, cancel } = useTimelineView();
  const fontsVersion = useFontsReady();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [widthPx, setWidthPx] = useState(800);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const read = () => setWidthPx(Math.max(50, el.clientWidth - LABEL_COL - RAIL_GUTTER));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const selected = useMemo(() => episodes.find((e) => e.id === selectedEpisodeId) ?? null, [episodes, selectedEpisodeId]);
  const matchingIds = useMemo(() => new Set(matching.map((e) => e.id)), [matching]);
  // The selection is drawn even when the filters would hide it, as on the map.
  const shown = useMemo(() => (selected && !matchingIds.has(selected.id) ? [...matching, selected] : matching), [matching, matchingIds, selected]);

  const win = useMemo(() => ({ from: Math.round(view.from), to: Math.round(view.to) }), [view]);
  const lanePx = LANE_PX[timelineSize];

  const rows = useMemo(
    () =>
      buildRows(shown, {
        view,
        window: win,
        widthPx,
        measure: measureLabel,
        lanePx,
        cap: LANE_CAP,
        expanded,
        selectedId: selectedEpisodeId,
        stateOf: (ep) => markerState(ep, { selectedId: selectedEpisodeId, hoveredId: hoveredEpisodeId, range: win }),
        text: (ep) => ({ title: pick(ep.title, lang), date: episodeDate(ep, lang) }),
        matches: (ep) => matchingIds.has(ep.id),
      }),
    // fontsVersion: re-measure once the web font has replaced the fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, view, win, widthPx, lanePx, expanded, selectedEpisodeId, hoveredEpisodeId, lang, matchingIds, fontsVersion],
  );

  const ticks = useMemo(() => axisTicks(view, widthPx), [view, widthPx]);
  const eras = useMemo(() => eraSegments(view, widthPx), [view, widthPx]);
  const bars = useMemo(() => histogram(matching.map((e) => e.anchor), bounds), [matching, bounds]);

  let focus: FocusBand | null = null;
  if (selected) {
    const x0 = yearToX(selected.from, view, widthPx);
    const x1 = Math.max(yearToX(selected.to + (selected.kind === 'point' ? 0 : 1), view, widthPx), x0 + 2);
    if (x1 > 0 && x0 < widthPx) focus = { x: x0, width: x1 - x0 };
  }

  const startYears = useMemo(() => matching.map((e) => e.from).sort((a, b) => a - b), [matching]);
  const playback = useTimelinePlayback(startYears);

  const visible = matching.filter((e) => overlaps(e.from, e.to, win)).length;
  const isFull = win.from === bounds.from && win.to === bounds.to;

  /**
   * Selecting an episode frames it (§12.2). Skips the selection a shared link opened with, so a
   * link's own period is not overridden on arrival.
   */
  const lastSelected = useRef(selectedEpisodeId);
  useEffect(() => {
    if (selectedEpisodeId === lastSelected.current) return;
    lastSelected.current = selectedEpisodeId;
    if (!selected) return;
    const next = selectionView(viewRef.current, selected, bounds);
    if (next) tweenTo(next, 520);
    const id = window.setTimeout(() => revealRow(selected.family?.id), next ? 540 : 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEpisodeId]);

  function revealRow(familyId: string | undefined) {
    const el = scrollRef.current;
    const row = familyId ? el?.querySelector<HTMLElement>(`[data-family="${familyId}"]`) : null;
    if (!el || !row) return;
    const top = row.offsetTop;
    if (top < el.scrollTop || top + row.offsetHeight > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: top - 4, behavior: scrollBehavior() });
    }
  }

  function bringSelectionIntoView() {
    if (!selected) return;
    tweenTo(selectionView(viewRef.current, selected, bounds) ?? centreView(viewRef.current, selected.anchor, bounds), 520);
  }

  /** The hand always wins: any press in the timeline stops playback and any running tween. */
  function takeOver() {
    playback.stop();
    cancel();
  }

  return (
    <section className={`tl tl--${timelineSize}`} aria-label={t(lang, 'timeline')}>
      <header
        className="tl__head"
        onDoubleClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) cycleTimelineSize();
        }}
      >
        <h2 className="tl__title">{t(lang, 'timeline')}</h2>
        <button
          type="button"
          className={`tl-btn tl-btn--play${playback.isPlaying ? ' is-playing' : ''}`}
          onClick={() => {
            cancel();
            playback.toggle();
          }}
          aria-pressed={playback.isPlaying}
          title={t(lang, 'playHint')}
        >
          {t(lang, playback.isPlaying ? 'pause' : 'play')}
        </button>
        <button type="button" className="tl__speed" onClick={playback.cycleSpeed} title={t(lang, 'speedHint')}>
          {playback.speed} {t(lang, 'perSecond')}
        </button>
        <span className="tl__hint">{t(lang, 'windowHint')}</span>
        <span className="tl__info" aria-live="polite">
          <span className="tl__sep">·</span>
          <span>
            <b>{visible}</b>
            {visible === episodes.length ? ` ${episodeNoun(visible, lang)}` : ` / ${episodes.length} ${episodeNoun(episodes.length, lang)}`}
          </span>
          <span className="tl__sep">·</span>
          <span className="tl__yrs">
            {formatYear(win.from, lang)}–{formatYear(win.to, lang)}
          </span>
        </span>
        <span className="tl__sp" />
        <button type="button" className="tl-btn tl-btn--sq" onClick={() => tweenTo(zoomView(viewRef.current, 1 / ZOOM_STEP, bounds), 500)} title={t(lang, 'widenPeriod')} aria-label={t(lang, 'widenPeriod')}>
          −
        </button>
        <button type="button" className="tl-btn tl-btn--sq" onClick={() => tweenTo(zoomView(viewRef.current, ZOOM_STEP, bounds), 500)} title={t(lang, 'narrowPeriod')} aria-label={t(lang, 'narrowPeriod')}>
          +
        </button>
        <button type="button" className="tl-btn" onClick={() => tweenTo(bounds, 520)} disabled={isFull}>
          {t(lang, 'resetRange')}
        </button>
        <div className="tl-size" role="group" aria-label={t(lang, 'resizeTimeline')}>
          {TIMELINE_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={s === timelineSize ? 'is-active' : undefined}
              onClick={() => setTimelineSize(s)}
              aria-pressed={s === timelineSize}
              title={t(lang, `size_${s}` as UiKey)}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="tl__grid" onPointerDownCapture={takeOver}>
        <div className="tl-eras">
          {eras.map((s) => (
            <button
              key={s.era.id}
              type="button"
              className="tl-era"
              style={{ left: s.x + 1, width: Math.max(0, s.width - 3), ['--c' as string]: s.era.color }}
              title={pick(s.era.name, lang)}
              onClick={() => tweenTo(eraView(s.era, bounds), 520)}
            >
              {s.showLabel ? pick(s.era.name, lang) : ''}
            </button>
          ))}
        </div>
        <div className="tl-axis" aria-hidden="true">
          {ticks.map((tk) => (
            <span key={tk.year} className={`tl-tick${tk.major ? ' is-major' : ''}`} style={{ left: tk.x }}>
              {formatYear(tk.year, lang)}
            </span>
          ))}
        </div>

        <div className="tl__viewport">
          <div className="tl-rows" ref={scrollRef}>
            <TimelineRows
              rows={rows}
              ticks={ticks}
              focus={focus}
              lanePx={lanePx}
              lang={lang}
              selected={selected}
              onSelect={(id) => selectEpisode(id)}
              onHover={setHoveredEpisodeId}
              onToggleRow={toggleRow}
              onEdge={bringSelectionIntoView}
            />
          </div>
          <TimelineRail scrollRef={scrollRef} rows={rows} lanePx={lanePx} lang={lang} />
        </div>

        <TimelineStrip
          bounds={bounds}
          view={view}
          bars={bars}
          lang={lang}
          onChange={commit}
          onCentre={(year) => tweenTo(centreView(viewRef.current, year, bounds), 360)}
          onPointerDown={takeOver}
        />
      </div>
    </section>
  );
}
