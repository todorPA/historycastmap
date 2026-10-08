import type { Episode, GeoData, HistoryEvent, Lang, LocalizedText, SeriesId } from '../types/events';
import { eraOf, type Era } from '../config/eras';
import { familyOf, type RegionFamily } from '../config/regionFamilies';
import { timestampToSeconds } from './podcast';

export type EpisodeKind = 'point' | 'range' | 'long';

/** Hand-checked corrections for one episode (HANDOFF §1). Every field is optional. */
export interface EpisodeOverride {
  from?: number;
  to?: number;
  kind?: EpisodeKind;
  placeId?: string;
  dateLabel?: LocalizedText;
  /** An English title; the dataset carries Serbian titles only. */
  title?: { en?: string };
}
export type EpisodeOverrides = Record<string, EpisodeOverride>;

/** One episode as the map, list and timeline see it. Derived; never stored. */
export interface EpisodeView {
  id: string;
  episode: Episode;
  title: LocalizedText;
  series: SeriesId;
  /** Every chapter, in audio order — including any trimmed from the period. */
  events: HistoryEvent[];
  from: number;
  to: number;
  kind: EpisodeKind;
  /** Year used for era, sorting and chronology. */
  anchor: number;
  era: Era;
  placeId: string;
  /** Timeline row. Undefined only if no chapter has a known region. */
  family: RegionFamily | undefined;
  regions: ReadonlySet<string>;
  types: ReadonlySet<string>;
  dateLabel?: LocalizedText;
}

const mid = (e: HistoryEvent) => (e.year + (e.yearEnd ?? e.year)) / 2;

function quantile(sorted: number[], p: number): number {
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

/**
 * Chapters that set the period. Tukey's fences with a 40-year floor: keeps the body of an
 * episode and drops "legacy" chapters such as a modern discovery in a medieval episode.
 */
function keptForPeriod(events: HistoryEvent[]): HistoryEvent[] {
  const mids = events.map(mid).sort((a, b) => a - b);
  const q1 = quantile(mids, 0.25);
  const q3 = quantile(mids, 0.75);
  const f = 1.5 * (q3 - q1) + 40;
  return events.filter((e) => mid(e) >= q1 - f && mid(e) <= q3 + f);
}

/**
 * The most frequent value of `key`, tie-broken by the event closest to the median mid-year —
 * so a tie resolves to whatever the episode is mostly about, and the result is deterministic.
 */
function mostFrequent(events: HistoryEvent[], key: (e: HistoryEvent) => string | undefined): string | undefined {
  const counts = new Map<string, number>();
  for (const e of events) {
    const k = key(e);
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;
  const top = Math.max(...counts.values());
  const tied = new Set([...counts].filter(([, c]) => c === top).map(([k]) => k));
  if (tied.size === 1) return [...tied][0];
  const median = quantile(events.map(mid).sort((a, b) => a - b), 0.5);
  let best: string | undefined;
  let bestDist = Infinity;
  for (const e of events) {
    const k = key(e);
    if (!k || !tied.has(k)) continue;
    const d = Math.abs(mid(e) - median);
    if (d < bestDist) [best, bestDist] = [k, d];
  }
  return best;
}

function kindOf(from: number, to: number): EpisodeKind {
  const span = to - from;
  return span <= 1 ? 'point' : span > 150 ? 'long' : 'range';
}

/** Chapters in the order the audio reaches them; untimed chapters keep their order, last. */
function byTimestamp(events: HistoryEvent[]): HistoryEvent[] {
  const t = (e: HistoryEvent) => (e.timestamp ? timestampToSeconds(e.timestamp) : Infinity);
  return events.map((e, i) => [e, i] as const).sort((a, b) => t(a[0]) - t(b[0]) || a[1] - b[1]).map(([e]) => e);
}

export function deriveEpisodes(data: GeoData, overrides: EpisodeOverrides = {}): EpisodeView[] {
  const byEpisode = new Map<string, HistoryEvent[]>();
  for (const e of data.events) {
    const list = byEpisode.get(e.episodeId);
    if (list) list.push(e);
    else byEpisode.set(e.episodeId, [e]);
  }

  const out: EpisodeView[] = [];
  for (const episode of data.episodes) {
    const events = byEpisode.get(episode.id);
    if (!events?.length) continue; // nothing to place
    const kept = keptForPeriod(events);
    const o = overrides[episode.id] ?? {};

    const from = o.from ?? Math.min(...kept.map((e) => e.year));
    const to = o.to ?? Math.max(...kept.map((e) => e.yearEnd ?? e.year));
    const kind = o.kind ?? kindOf(from, to);
    const anchor = kind === 'point' ? from : Math.round((from + to) / 2);

    out.push({
      id: episode.id,
      episode,
      title: o.title?.en ? { ...episode.title, en: o.title.en } : episode.title,
      series: episode.series ?? 'main',
      events: byTimestamp(events),
      from,
      to,
      kind,
      anchor,
      era: eraOf(anchor),
      placeId: o.placeId ?? mostFrequent(kept, (e) => e.placeId)!,
      family: familyOf(mostFrequent(kept, (e) => e.region)),
      regions: new Set(events.map((e) => e.region).filter((r): r is string => !!r)),
      types: new Set<string>(events.flatMap((e) => (e.type ? [e.type] : []))),
      dateLabel: o.dateLabel,
    });
  }
  return out;
}

/** Full timeline extent (HANDOFF §12.2): padded, then rounded out to the decade. */
export function timelineExtent(episodes: Array<{ from: number; to: number }>): { from: number; to: number } {
  const min = Math.min(...episodes.map((e) => e.from));
  const max = Math.max(...episodes.map((e) => e.to));
  const pad = Math.min(40, Math.max(10, 0.03 * (max - min)));
  return { from: Math.floor((min - pad) / 10) * 10, to: Math.ceil((max + pad) / 10) * 10 };
}

/** The card eyebrow's episode label (HANDOFF §1). */
export function episodeLabel(id: string, series: SeriesId, lang: Lang): string {
  const n = /^(\d+)/.exec(id);
  if (n) return `${lang === 'en' ? 'Episode' : 'Epizoda'} ${Number(n[1])}`;
  if (id.includes('cetvrtkom')) return 'HistoryCast četvrtkom';
  if (id.includes('nedeljom')) return 'HistoryCast nedeljom';
  if (id.startsWith('specijal')) return lang === 'en' ? 'Special' : 'Specijal';
  if (series === 'side') return lang === 'en' ? 'Thematic episode' : 'Tematska epizoda';
  return lang === 'en' ? 'Unnumbered episode' : 'Epizoda bez broja';
}
