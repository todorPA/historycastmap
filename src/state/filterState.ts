import type { EpisodeFilterState, FilterGroup } from '../lib/episodeFilters';

/** Add the value to its group, or remove it if present. Never mutates. */
export function toggleFilterValue(f: EpisodeFilterState, group: FilterGroup, value: string): EpisodeFilterState {
  const list: string[] = f[group];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return { ...f, [group]: next };
}

/** Picking the selected episode again deselects it (HANDOFF §7). */
export function toggleSelection(current: string | null, id: string): string | null {
  return current === id ? null : id;
}
