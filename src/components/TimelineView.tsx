import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import type { TimelineOptions } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { useCollectionEpisodes, useData, useSideEpisodes } from '../state/DataContext';
import { useTime } from '../state/TimeContext';
import { useFilters } from '../state/FilterContext';
import { TIMELINE_SIZES } from '../state/FilterContext';
import type { TimelineSize } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';
import type { UiKey } from '../lib/i18n';
import { onColor, regionColor } from '../config/regions';
import { dateToYear, formatYear, formatYearRange, yearToDate } from '../lib/time';
import { useTimelinePlayback } from './useTimelinePlayback';
import type { Lang } from '../types/events';

const RANGE_DEBOUNCE_MS = 150;

/** Share of the viewport the timeline may occupy at each size step. */
const SIZE_FRACTION: Record<TimelineSize, number> = { s: 0.24, m: 0.45, l: 0.7 };
const MIN_PANEL_PX = 150;

/**
 * Vertical breathing room per step. Without this, raising the size does nothing visible when
 * a single episode is selected: the panel is as tall as its content, and a handful of region
 * groups never reaches the cap. Growing the item margin makes "bigger" mean "more legible",
 * which is what the control is for.
 */
const SIZE_MARGIN: Record<TimelineSize, number> = { s: 6, m: 16, l: 28 };

/**
 * vis gets a cap in pixels, never '100%'. A percentage forces vis to measure its parent at
 * construction time — and if that height isn't settled yet it lays out at zero and draws
 * nothing (the blank-on-first-load bug). Pixels also let the panel size itself to its
 * content, so there's no empty band under the last group.
 */
function maxHeightPx(size: TimelineSize, viewportHeight: number): number {
  return Math.max(MIN_PANEL_PX, Math.round(viewportHeight * SIZE_FRACTION[size]));
}

/**
 * vis-timeline labels dates with moment's zero-padded year ("0500", "-0600"). We want
 * plain historical years: "500", "600. p.n.e." / "600 BC". Callbacks get a moment-like
 * value, so accept either that or a Date.
 *
 * Must never throw: this runs inside vis's render loop, and an exception there leaves the
 * whole timeline blank.
 */
function axisLabel(value: unknown, lang: Lang): string {
  try {
    const maybeMoment = value as { toDate?: () => Date };
    const date =
      typeof maybeMoment?.toDate === 'function'
        ? maybeMoment.toDate()
        : value instanceof Date
          ? value
          : new Date(String(value));
    const year = dateToYear(date);
    return Number.isFinite(year) ? formatYear(year, lang) : '';
  } catch {
    return '';
  }
}

interface Item {
  id: string;
  content: string;
  start: Date;
  end?: Date;
  group?: string;
  style: string;
  className: string;
  title: string;
}

export default function TimelineView() {
  const { data } = useData();
  const { range, bounds, setRange } = useTime();
  const {
    lang,
    activeCollectionId,
    activeEpisodeId,
    selectedEventId,
    setSelectedEventId,
    timelineSize,
    setTimelineSize,
    cycleTimelineSize,
  } = useFilters();
  const collectionEpisodes = useCollectionEpisodes(activeCollectionId);
  const sideEpisodeIds = useSideEpisodes();

  // Panel height cycles small → medium → large: with many region groups the default strip
  // is too cramped to read, so the user can raise the timeline over the map.
  const size = timelineSize;
  const cycleSize = cycleTimelineSize;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const itemsRef = useRef(new DataSet<Item>());
  const groupsRef = useRef(new DataSet<{ id: string; content: string }>());
  /** Guards the two-way sync: window changes we caused ourselves must not echo back. */
  const applyingRef = useRef(false);
  const debounceRef = useRef<number | undefined>(undefined);

  /**
   * Scoped to the collection and episode, but deliberately not to the year range: scrubbing
   * narrow would delete the very items you need in order to scrub back out.
   *
   * The collection has to be honoured here or the two halves disagree. Picking "Srpski
   * srednji vek" left the map showing fifty medieval events while the axis still showed
   * Marathon and Thermopylae, which makes the timeline look unrelated to the map it drives.
   */
  const items = useMemo<Item[]>(
    () =>
      data.events
        .filter((e) => collectionEpisodes == null || collectionEpisodes.has(e.episodeId))
        .filter((e) => activeEpisodeId == null || e.episodeId === activeEpisodeId)
        .map((e) => {
          // Same colour language as the map: region, not episode (config/regions.ts).
          const color = regionColor(e.region);
          const low = e.confidence === 'low';
          const side = sideEpisodeIds.has(e.episodeId);
          return {
            id: e.id,
            content: pick(e.title, lang),
            start: yearToDate(e.year),
            end: e.yearEnd != null && e.yearEnd !== e.year ? yearToDate(e.yearEnd) : undefined,
            group: e.region || undefined,
            /**
             * Label colour is chosen per fill, not fixed: the region hues span a wide
             * lightness range, so white is unreadable on the light ones and ink is
             * unreadable on the dark ones.
             *
             * Low confidence is marked by the dashed border alone (.vis-item--low). It used
             * to also drop opacity to 0.6, which was survivable on the old dark panel but on
             * the light one washed the fill out until the label disappeared.
             */
            style: `background-color:${color};border-color:${color};color:${onColor(color)};`,
            /**
             * Two independent marks, so they compose: dashed border for low confidence, a
             * left-edge notch for the side series (.vis-item--side). Same meaning as the
             * centre pip on the map.
             */
            className: [low ? 'vis-item--low' : '', side ? 'vis-item--side' : '']
              .filter(Boolean)
              .join(' '),
            title: `${pick(e.title, lang)} — ${formatYearRange(e.year, e.yearEnd, lang)}`,
          };
        }),
    [data.events, collectionEpisodes, activeEpisodeId, lang, sideEpisodeIds],
  );

  /**
   * Busiest region first, rather than whatever order the data happened to arrive in.
   *
   * Group membership deliberately ignores the year range (see `items` above), so a region
   * with nothing in the current window still holds a row. Ordering by weight means those
   * empty rows collect below the fold instead of pushing the populated ones out of a panel
   * that is only a few hundred pixels tall.
   */
  /** Sorted once per item change; playback uses it to skip centuries with no events. */
  const eventYears = useMemo(
    () => items.map((i) => dateToYear(i.start)).sort((a, b) => a - b),
    [items],
  );
  const playback = useTimelinePlayback(eventYears);
  /** Read from the create-once effect without re-creating the timeline when it changes. */
  const playbackRef = useRef(playback);
  playbackRef.current = playback;

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) {
      if (i.group) counts.set(i.group, (counts.get(i.group) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([r]) => ({ id: r, content: r }));
  }, [items]);

  // Latest values readable from the create-once effect without re-creating the timeline.
  const latestItems = useRef(items);
  const latestGroups = useRef(groups);
  latestItems.current = items;
  latestGroups.current = groups;

  // Create the timeline once.
  useEffect(() => {
    if (!containerRef.current) return;

    // Populate BEFORE constructing. vis measures its content at construction time, and
    // with empty DataSets it lays out at zero height — items arriving afterwards update
    // the items but not the panel, so the timeline stayed blank until something forced a
    // redraw (a click, a resize). The items effect below keeps these in sync afterwards.
    groupsRef.current.clear();
    groupsRef.current.add(latestGroups.current);
    itemsRef.current.clear();
    itemsRef.current.add(latestItems.current);

    const options: TimelineOptions = {
      min: yearToDate(bounds.from - 50),
      max: yearToDate(bounds.to + 50),
      start: yearToDate(range.from),
      end: yearToDate(range.to),
      zoomMin: 1000 * 60 * 60 * 24 * 365 * 5, // ~5 years
      stack: true,
      // Pixel cap, not '100%' — see maxHeightPx above. vis then scrolls internally when the
      // region groups don't fit.
      maxHeight: maxHeightPx(size, window.innerHeight),
      verticalScroll: true,
      margin: { item: SIZE_MARGIN[size] },
      /**
       * Declared, not detected, and load-bearing. When `rtl` is absent the vis constructor
       * hides its own root (`visibility: hidden`) to sniff text direction off the DOM, and
       * only restores it from the `changed` handler, guarded by
       * `initialRangeChangeDone || (!options.start && !options.end)`. We pass start/end as
       * Dates, which are always truthy, so that second escape can never fire for us — and
       * when the initial window already equals the start/end we asked for, nothing changes
       * the range, no `rangechanged` is emitted, and the panel stays invisible for good with
       * a fully correct layout underneath. Saying LTR outright skips that branch entirely.
       * The app has no RTL support to detect, so this is honest rather than a workaround.
       */
      rtl: false,
      /**
       * Both keys, deliberately. Passing only `axis` leaves `orientation.item` undefined,
       * and vis treats anything that isn't 'top' as bottom-anchored: on every increase in
       * content height `_updateScrollTop` shifts scrollTop by the full delta, to hold the
       * items still against a bottom axis. With groups taller than the panel that opened the
       * timeline scrolled to the end of the stack, on its last regions instead of its first.
       */
      orientation: { axis: 'top', item: 'top' },
      selectable: true,
      multiselect: false,
      showCurrentTime: false,
      tooltip: { followMouse: true },
      format: {
        minorLabels: (date: unknown) => axisLabel(date, lang),
      },
    };

    const timeline = new Timeline(
      containerRef.current,
      itemsRef.current as never,
      groupsRef.current as never,
      options,
    );
    timelineRef.current = timeline;

    timeline.on('rangechanged', (props: { start: Date; end: Date }) => {
      if (applyingRef.current) return;
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        setRange(dateToYear(props.start), dateToYear(props.end));
      }, RANGE_DEBOUNCE_MS);
    });

    timeline.on('select', (props: { items: string[] }) => {
      setSelectedEventId(props.items[0] ?? null);
    });

    /**
     * The hand always wins. Playback is driving the same window the user is about to grab,
     * so any press on the axis stops it rather than fighting the drag. Listening for
     * pointerdown on the container rather than vis's own range events, because those also
     * fire for the window changes playback itself is making.
     */
    const stopOnTouch = () => playbackRef.current.stop();
    containerRef.current.addEventListener('pointerdown', stopOnTouch);

    // First paint may land before the grid has its final height; redraw once it has.
    const initialRedraw = window.requestAnimationFrame(() => {
      if (containerRef.current?.isConnected) timeline.redraw();
    });

    const container = containerRef.current;
    return () => {
      window.cancelAnimationFrame(initialRedraw);
      window.clearTimeout(debounceRef.current);
      container.removeEventListener('pointerdown', stopOnTouch);
      timeline.destroy();
      timelineRef.current = null;
    };
    // Created once; data and window are pushed in by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push items/groups into the DataSets in place (no timeline re-create).
  useEffect(() => {
    groupsRef.current.clear();
    groupsRef.current.add(groups);
    itemsRef.current.clear();
    itemsRef.current.add(items);
  }, [items, groups]);

  // External range changes (e.g. "Full period", dataset swap) move the window.
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const win = timeline.getWindow();
    if (dateToYear(win.start) === range.from && dateToYear(win.end) === range.to) return;
    applyingRef.current = true;
    timeline.setWindow(yearToDate(range.from), yearToDate(range.to), { animation: false });

    /**
     * Repaint explicitly. vis only auto-redraws on a range change once `initialDrawDone` is
     * set, and that flag lives in the same guarded block the `rtl: false` option above skips
     * past: because we pass start/end, it stays gated on an `initialRangeChangeDone` that
     * never arrives. The window moves internally and the axis keeps its old extent.
     *
     * Nothing noticed until playback, because every other caller that moves the window also
     * changes `items`, and repopulating the DataSets forces a redraw by another route.
     * Playback moves only the window, so it painted nothing at all.
     */
    if (containerRef.current?.isConnected) timeline.redraw();
    // Release the guard after vis has emitted its own rangechanged for this call.
    window.setTimeout(() => {
      applyingRef.current = false;
    }, RANGE_DEBOUNCE_MS + 50);
  }, [range.from, range.to]);

  // Axis limits live in the create-once options object, so they need their own update:
  // a dataset swap changes bounds, and stale min/max would clamp navigation to the old extent.
  useEffect(() => {
    timelineRef.current?.setOptions({
      min: yearToDate(bounds.from - 50),
      max: yearToDate(bounds.to + 50),
    });
  }, [bounds.from, bounds.to]);

  // Axis labels are language-dependent ("431. p.n.e." vs "431 BC").
  useEffect(() => {
    timelineRef.current?.setOptions({
      format: {
        minorLabels: (date: unknown) => axisLabel(date, lang),
      },
    });
  }, [lang]);

  /**
   * Size step drives three things at once, and it has to, to feel like "enlarge":
   *  - 's' caps the height and lets the panel shrink to its content (no empty band).
   *  - 'm'/'l' set an explicit pixel height, so the panel visibly fills that space even when
   *    a single episode has only a few region groups; vis scrolls internally past it.
   *  - the item margin grows, so rows get more breathing room rather than just more space.
   * Pixels, never '%': a percentage makes vis measure its parent and it lays out at zero
   * height before the grid settles.
   */
  useEffect(() => {
    const apply = () => {
      const px = maxHeightPx(size, window.innerHeight);
      // vis accepts null to clear height/maxHeight, but its types declare only string|number,
      // so this cast is about the typings, not the runtime contract.
      timelineRef.current?.setOptions({
        height: (size === 's' ? null : px) as unknown as number,
        maxHeight: (size === 's' ? px : null) as unknown as number,
        margin: { item: SIZE_MARGIN[size] },
      });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [size]);

  /**
   * vis reads DOM geometry during redraw, so calling it while the container is detached
   * throws ("Cannot read properties of null (reading 'left')"). Both callers below can fire
   * after unmount — a queued frame, or a ResizeObserver notification.
   */
  const safeRedraw = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline || !containerRef.current?.isConnected) return;
    timeline.redraw();
  }, []);

  // Keeps the timeline correct across layout changes: window resizes, the sidebar drawer on
  // mobile, and the panel's own size steps.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(safeRedraw);
    observer.observe(el);
    return () => observer.disconnect();
  }, [safeRedraw]);

  // Keep timeline selection in sync with map/sidebar selection.
  useEffect(() => {
    timelineRef.current?.setSelection(selectedEventId ? [selectedEventId] : []);
  }, [selectedEventId]);

  return (
    <section className={`timeline timeline--${size}`}>
      <header className="timeline__head" onDoubleClick={cycleSize}>
        <h2>{t(lang, 'timeline')}</h2>
        {/* Action, its setting, the readout it drives, and the panel control: four different
            kinds of thing, spaced and weighted so they do not read as four peer buttons. */}
        <div className="timeline__tools">
          <button
            type="button"
            className={`timeline__play${playback.isPlaying ? ' is-playing' : ''}`}
            onClick={playback.toggle}
            title={t(lang, 'playHint')}
            aria-pressed={playback.isPlaying}
          >
            {t(lang, playback.isPlaying ? 'pause' : 'play')}
          </button>

          <button
            type="button"
            className="timeline__speed"
            onClick={playback.cycleSpeed}
            title={t(lang, 'speedHint')}
          >
            {playback.speed} {t(lang, 'perSecond')}
          </button>

          {/* Mono and tabular in a reserved width, so the digits climb in place during
              playback instead of shoving the controls around. */}
          <span className="timeline__range">{formatYearRange(range.from, range.to, lang)}</span>

          {/* Three explicit steps rather than one cycling caret: a single glyph cannot say
              "three heights, you are on the second". Same segmented idiom as the language
              toggle, so the state is visible instead of inferred. */}
          <div className="timeline__size" role="group" aria-label={t(lang, 'resizeTimeline')}>
            {TIMELINE_SIZES.map((step) => (
              <button
                key={step}
                type="button"
                className={`timeline__size__btn${step === size ? ' is-active' : ''}`}
                onClick={() => setTimelineSize(step)}
                aria-pressed={step === size}
                title={t(lang, `size_${step}` as UiKey)}
              >
                {step.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="timeline__canvas" ref={containerRef} />
    </section>
  );
}
