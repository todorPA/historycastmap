import { useEffect, useMemo, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import type { TimelineOptions } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { useData } from '../state/DataContext';
import { useTime } from '../state/TimeContext';
import { useFilters } from '../state/FilterContext';
import type { TimelineSize } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';
import { dateToYear, formatYear, formatYearRange, yearToDate } from '../lib/time';
import type { Lang } from '../types/events';

const RANGE_DEBOUNCE_MS = 150;

/** Share of the viewport the timeline may occupy at each size step. */
const SIZE_FRACTION: Record<TimelineSize, number> = { s: 0.24, m: 0.45, l: 0.7 };
const MIN_PANEL_PX = 150;

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
  const { data, episodesById } = useData();
  const { range, bounds, setRange } = useTime();
  const { lang, activeEpisodeId, selectedEventId, setSelectedEventId, timelineSize, cycleTimelineSize } =
    useFilters();
  // Panel height cycles small → medium → large: with many region groups the default strip
  // is too cramped to read, so the user can raise the timeline over the map.
  const size = timelineSize;
  const cycleSize = cycleTimelineSize;
  const sizeLabel = size === 'l' ? '▾' : '▴';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);
  const itemsRef = useRef(new DataSet<Item>());
  const groupsRef = useRef(new DataSet<{ id: string; content: string }>());
  /** Guards the two-way sync: window changes we caused ourselves must not echo back. */
  const applyingRef = useRef(false);
  const debounceRef = useRef<number | undefined>(undefined);

  // The timeline shows everything in the current episode, regardless of the year range —
  // otherwise scrubbing narrow would delete the items needed to scrub back out.
  const items = useMemo<Item[]>(
    () =>
      data.events
        .filter((e) => activeEpisodeId == null || e.episodeId === activeEpisodeId)
        .map((e) => {
          const color = episodesById[e.episodeId]?.color ?? '#7f8c8d';
          const low = e.confidence === 'low';
          return {
            id: e.id,
            content: pick(e.title, lang),
            start: yearToDate(e.year),
            end: e.yearEnd != null && e.yearEnd !== e.year ? yearToDate(e.yearEnd) : undefined,
            group: e.region || undefined,
            style: `background-color:${color};border-color:${color};${low ? 'opacity:0.6;' : ''}`,
            className: low ? 'vis-item--low' : '',
            title: `${pick(e.title, lang)} — ${formatYearRange(e.year, e.yearEnd, lang)}`,
          };
        }),
    [data.events, episodesById, activeEpisodeId, lang],
  );

  const groups = useMemo(() => {
    const regions = Array.from(new Set(items.map((i) => i.group).filter(Boolean))) as string[];
    return regions.map((r) => ({ id: r, content: r }));
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
      margin: { item: 6 },
      orientation: { axis: 'top' },
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

    // First paint may land before the grid has its final height; redraw once it has.
    const initialRedraw = window.requestAnimationFrame(() => timeline.redraw());

    return () => {
      window.cancelAnimationFrame(initialRedraw);
      window.clearTimeout(debounceRef.current);
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

  // The panel cap depends on the size step and the viewport, so recompute on both.
  useEffect(() => {
    const apply = () =>
      timelineRef.current?.setOptions({ maxHeight: maxHeightPx(size, window.innerHeight) });
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [size]);

  /**
   * vis measures its container once, on construction. In a CSS grid the final height may
   * not be settled yet, so it can come up with zero height and draw nothing until
   * something forces a redraw. Observing the container fixes the empty-on-first-load case
   * and any later layout change (window resize, sidebar drawer on mobile).
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => timelineRef.current?.redraw());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep timeline selection in sync with map/sidebar selection.
  useEffect(() => {
    timelineRef.current?.setSelection(selectedEventId ? [selectedEventId] : []);
  }, [selectedEventId]);

  return (
    <section className={`timeline timeline--${size}`}>
      <header className="timeline__head" onDoubleClick={cycleSize}>
        <h2>{t(lang, 'timeline')}</h2>
        <span className="timeline__range">{formatYearRange(range.from, range.to, lang)}</span>
        <button
          type="button"
          className="timeline__resize"
          onClick={cycleSize}
          title={t(lang, 'resizeTimeline')}
          aria-label={t(lang, 'resizeTimeline')}
        >
          {sizeLabel}
        </button>
      </header>
      <div className="timeline__canvas" ref={containerRef} />
    </section>
  );
}
