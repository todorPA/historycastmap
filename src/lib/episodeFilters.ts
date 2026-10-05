import type { SeriesId } from '../types/events';
import type { Collection } from '../config/collections';
import type { EpisodeView } from './episodeModel';

/** Active values per filter group (HANDOFF §6.3). Empty array = no restriction. */
export interface EpisodeFilterState {
  collections: string[];
  series: SeriesId[];
  regions: string[];
  types: string[];
}
export type FilterGroup = keyof EpisodeFilterState;

export const EMPTY_FILTERS: EpisodeFilterState = { collections: [], series: [], regions: [], types: [] };

/** Collection id → its episode ids, as Sets so membership is O(1). */
export type CollectionMembers = ReadonlyMap<string, ReadonlySet<string>>;

export function collectionMembers(collections: Collection[]): CollectionMembers {
  return new Map(collections.map((c) => [c.id, new Set(c.episodeIds)]));
}

function hasValue(ep: EpisodeView, group: FilterGroup, value: string, members: CollectionMembers): boolean {
  switch (group) {
    case 'collections':
      return members.get(value)?.has(ep.id) ?? false;
    case 'series':
      return ep.series === value;
    case 'regions':
      return ep.regions.has(value); // any chapter in the region (§6.3)
    case 'types':
      return ep.types.has(value);
  }
}

/** OR within a group; an empty group admits everything. */
function inGroup(ep: EpisodeView, group: FilterGroup, values: readonly string[], members: CollectionMembers): boolean {
  return values.length === 0 || values.some((v) => hasValue(ep, group, v, members));
}

const GROUPS: FilterGroup[] = ['collections', 'series', 'regions', 'types'];

/** AND across groups. `except` skips one group — how chip counts ignore their own selection. */
export function matchesFilters(
  ep: EpisodeView,
  f: EpisodeFilterState,
  members: CollectionMembers,
  except?: FilterGroup,
): boolean {
  return GROUPS.every((g) => g === except || inGroup(ep, g, f[g], members));
}

/** Every value a group can take, in display order. Values come from the data itself. */
function valuesOf(episodes: EpisodeView[], group: FilterGroup, members: CollectionMembers): string[] {
  if (group === 'collections') return [...members.keys()];
  if (group === 'series') return ['main', 'side'];
  const all = new Set<string>();
  for (const e of episodes) for (const v of group === 'regions' ? e.regions : e.types) all.add(v);
  return [...all];
}

/**
 * Per chip: how many episodes would match if it were picked, given every OTHER group's
 * selection (HANDOFF §6.4). Counts episodes, not events. `accept` ANDs search on top.
 */
export function chipCounts(
  episodes: EpisodeView[],
  f: EpisodeFilterState,
  members: CollectionMembers,
  group: FilterGroup,
  accept: (e: EpisodeView) => boolean = () => true,
): Map<string, number> {
  const base = episodes.filter((e) => accept(e) && matchesFilters(e, f, members, group));
  return new Map(valuesOf(episodes, group, members).map((v) => [v, base.filter((e) => hasValue(e, group, v, members)).length]));
}

/** A zero-count chip is unavailable — unless it is active, so it can always be removed. */
export function isChipDisabled(count: number | undefined, active: boolean): boolean {
  return !active && (count ?? 0) === 0;
}

/** The badge on the filter button: active values across all groups, Zbirke included. */
export function activeFilterCount(f: EpisodeFilterState): number {
  return GROUPS.reduce((n, g) => n + f[g].length, 0);
}
