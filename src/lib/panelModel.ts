import type { Lang } from '../types/events';
import { ERAS, type Era } from '../config/eras';
import { COLLECTIONS } from '../config/collections';
import { regionLabel } from '../config/regions';
import { t, pick, type UiKey } from './i18n';
import { formatYear } from './time';
import { episodeCount } from './plural';
import { overlaps } from './episodeVisibility';
import type { EpisodeView } from './episodeModel';
import type { EpisodeFilterState, FilterGroup } from './episodeFilters';

/**
 * Chronological order: anchor, then start, then Serbian title. The tie-breaks make it total,
 * so ↑/↓ in the list and ←/→ between episodes always step the same way.
 */
export function chronological(a: EpisodeView, b: EpisodeView): number {
  return a.anchor - b.anchor || a.from - b.from || a.title.sr.localeCompare(b.title.sr, 'sr');
}

export interface EraGroup {
  era: Era;
  episodes: EpisodeView[];
  /** How many overlap the timeline window — the header's "5/31". */
  inWindow: number;
}

/** The list's sections (HANDOFF §7): eras in order, empty ones omitted. */
export function groupByEra(episodes: EpisodeView[], range: { from: number; to: number }): EraGroup[] {
  return ERAS.map((era) => {
    const members = episodes.filter((e) => e.era.id === era.id).sort(chronological);
    return { era, episodes: members, inWindow: members.filter((e) => overlaps(e.from, e.to, range)).length };
  }).filter((g) => g.episodes.length > 0);
}

export interface ActiveChip {
  group: FilterGroup;
  value: string;
  label: string;
}

function chipLabel(group: FilterGroup, value: string, lang: Lang): string {
  switch (group) {
    case 'collections':
      return pick(COLLECTIONS.find((c) => c.id === value)?.title, lang) || value;
    case 'series':
      return t(lang, `series_${value}` as UiKey);
    case 'regions':
      return regionLabel(value, lang);
    case 'types':
      return t(lang, `type_${value}` as UiKey);
  }
}

const GROUP_ORDER: FilterGroup[] = ['collections', 'series', 'regions', 'types'];

/** The removable chips under the search box (§4.4): one per active value, in group order. */
export function activeChips(f: EpisodeFilterState, lang: Lang): ActiveChip[] {
  return GROUP_ORDER.flatMap((group) =>
    (f[group] as string[]).map((value) => ({ group, value, label: chipLabel(group, value, lang) })),
  );
}

/** "178 epizoda · 499. p.n.e. – 2009" — the panel header's universe line (§4.2). */
export function universeLine(episodes: EpisodeView[], lang: Lang): string {
  if (episodes.length === 0) return episodeCount(0, lang);
  const from = Math.min(...episodes.map((e) => e.from));
  const to = Math.max(...episodes.map((e) => e.to));
  return `${episodeCount(episodes.length, lang)} · ${formatYear(from, lang)} – ${formatYear(to, lang)}`;
}

/**
 * An episode's date as the list and card show it (HANDOFF §7): "1331–1355", "1389",
 * "499. p.n.e.–479. p.n.e.". No spaces round the dash, unlike formatYearRange. A hand-checked
 * dateLabel ("28. jun 1389.") wins when there is one.
 */
export function episodeDate(ep: Pick<EpisodeView, 'from' | 'to' | 'dateLabel'>, lang: Lang): string {
  if (ep.dateLabel) return pick(ep.dateLabel, lang);
  return ep.from === ep.to ? formatYear(ep.from, lang) : `${formatYear(ep.from, lang)}–${formatYear(ep.to, lang)}`;
}
