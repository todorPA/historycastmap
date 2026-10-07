import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS } from '../lib/episodeFilters';
import { toggleFilterValue, toggleSelection } from './filterState';

describe('toggleFilterValue', () => {
  it('adds a value to its group, and only that group', () => {
    const f = toggleFilterValue(EMPTY_FILTERS, 'regions', 'Balkan');
    expect(f).toEqual({ ...EMPTY_FILTERS, regions: ['Balkan'] });
  });

  it('removes a value that is already active', () => {
    const f = toggleFilterValue({ ...EMPTY_FILTERS, collections: ['antika', 'azija'] }, 'collections', 'antika');
    expect(f.collections).toEqual(['azija']);
  });

  it('returns a new object and leaves the old one alone', () => {
    const before = { ...EMPTY_FILTERS, types: ['battle'] };
    const after = toggleFilterValue(before, 'types', 'siege');
    expect(after).not.toBe(before);
    expect(before.types).toEqual(['battle']);
  });
});

describe('toggleSelection', () => {
  it('selects, and deselects on a second pick (§7)', () => {
    expect(toggleSelection(null, '43')).toBe('43');
    expect(toggleSelection('43', '43')).toBeNull();
    expect(toggleSelection('43', '44')).toBe('44');
  });
});
