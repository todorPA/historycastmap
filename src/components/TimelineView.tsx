import { useEffect, useMemo, useRef } from 'react';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import type { TimelineOptions } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import { useData } from '../state/DataContext';
import { useTime } from '../state/TimeContext';
import { useFilters } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';
import { dateToYear, formatYear, formatYearRange, yearToDate } from '../lib/time';
import type { Lang } from '../types/events';

const RANGE_DEBOUNCE_MS = 150;

/**
 * vis-timeline labels dates with moment's zero-padded year ("0500", "-0600"). We want
 * plain historical years: "500", "600. p.n.e." / "600 BC". Callbacks get a moment-like
 * value, so accept either that or a Date.
 */
function axisLabel(value: unknown, lang: Lang): string {
  const maybeMoment = value as { toDate?: () => Date };
  const date =
    typeof maybeMoment?.toDate === 'function' ? maybeMoment.toDate() : new Date(value as string);
  return formatYear(dateToYear(date), lang);
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

  // Create the timeline once.
  useEffect(() => {
    if (!containerRef.current) return;

    const options: TimelineOptions = {
      min: yearToDate(bounds.from - 50),
      max: yearToDate(bounds.to + 50),
      start: yearToDate(range.from),
      end: yearToDate(range.to),
      zoomMin: 1000 * 60 * 60 * 24 * 365 * 5, // ~5 years
      stack: true,
      height: '100%',
      // More region groups than fit in the panel: scroll them instead of clipping.
      verticalScroll: true,
      margin: { item: 6 },
      orientation: { axis: 'top' },
      selectable: true,
      multiselect: false,
      showCurrentTime: false,
      tooltip: { followMouse: true },
      format: {
        minorLabels: (date: unknown) => axisLabel(date, lang),
        majorLabels: () => '',
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

    return () => {
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
        majorLabels: () => '',
      },
    });
  }, [lang]);

  // The panel grew or shrank — vis needs to recompute its canvas.
  useEffect(() => {
    timelineRef.current?.redraw();
  }, [size]);

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
