import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { COLLECTIONS } from '../config/collections';
import { deriveEpisodes } from './episodeModel';
import { EMPTY_FILTERS, activeFilterCount, chipCounts, collectionMembers, isChipDisabled, matchesFilters } from './episodeFilters';
import type { EpisodeFilterState } from './episodeFilters';

import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data);
const members = collectionMembers(COLLECTIONS);
const result = (f: EpisodeFilterState) => episodes.filter((e) => matchesFilters(e, f, members)).length;
const counts = (f: EpisodeFilterState, g: keyof EpisodeFilterState) => Object.fromEntries(chipCounts(episodes, f, members, g));

describe('chip counts reproduce the prototype', () => {
  it('with no filters (prototype-2.png)', () => {
    expect(counts(EMPTY_FILTERS, 'collections')).toMatchObject({
      'srpski-srednji-vek': 12, 'drugi-svetski-rat': 16, 'veliki-rat': 8, antika: 8, 'moderna-srbija': 9, azija: 7,
    });
    expect(counts(EMPTY_FILTERS, 'series')).toMatchObject({ main: 151, side: 27 });
    expect(counts(EMPTY_FILTERS, 'regions')).toMatchObject({
      'Zapadna Evropa': 59, 'Severna Evropa i Atlantik': 4, 'Srednja Evropa': 23, 'Istočna Evropa': 26,
      'Vizantija i Egejski svet': 15, 'Osmansko carstvo': 9, 'Bliski istok': 15, Afrika: 9,
      'Severna Amerika': 15, 'Južna Amerika': 1, Balkan: 87, Azija: 10,
    });
  });

  it('with Srpski srednji vek + Moderna Srbija (prototype-3.png)', () => {
    const f = { ...EMPTY_FILTERS, collections: ['srpski-srednji-vek', 'moderna-srbija'] };
    expect(result(f)).toBe(21);
    // A group's own counts ignore its own selection, so the Zbirke counts do not move.
    expect(counts(f, 'collections')).toMatchObject({ 'srpski-srednji-vek': 12, 'moderna-srbija': 9, azija: 7 });
    expect(counts(f, 'series')).toMatchObject({ main: 20, side: 1 });
    expect(counts(f, 'regions')).toMatchObject({
      'Zapadna Evropa': 2, 'Severna Evropa i Atlantik': 0, 'Srednja Evropa': 1, 'Istočna Evropa': 2,
      'Vizantija i Egejski svet': 0, 'Osmansko carstvo': 2, 'Bliski istok': 1, Afrika: 0,
      'Severna Amerika': 0, 'Južna Amerika': 0, Balkan: 21, Azija: 0,
    });
  });
});

describe('logic', () => {
  it('ORs within a group', () => {
    const both = episodes.filter((e) => e.regions.has('Azija') && e.regions.has('Afrika')).length;
    const azija = result({ ...EMPTY_FILTERS, regions: ['Azija'] });
    const afrika = result({ ...EMPTY_FILTERS, regions: ['Afrika'] });
    expect(result({ ...EMPTY_FILTERS, regions: ['Azija', 'Afrika'] })).toBe(azija + afrika - both);
  });

  it('ANDs across groups', () => {
    expect(result({ ...EMPTY_FILTERS, collections: ['srpski-srednji-vek'], series: ['side'] })).toBe(0);
  });

  it('applies an extra predicate (search) on top', () => {
    const only43 = (e: { id: string }) => e.id === '43';
    expect(episodes.filter((e) => matchesFilters(e, EMPTY_FILTERS, members) && only43(e))).toHaveLength(1);
    expect(Object.fromEntries(chipCounts(episodes, EMPTY_FILTERS, members, 'series', only43))).toMatchObject({ main: 1, side: 0 });
  });

  it('counts active values across every group, Zbirke included', () => {
    expect(activeFilterCount({ collections: ['a', 'b'], series: ['side'], regions: [], types: ['battle'] })).toBe(4);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });
});

describe('dependent options (§6.4)', () => {
  const f = { ...EMPTY_FILTERS, collections: ['srpski-srednji-vek'] };

  it('disables what Srpski srednji vek rules out — the handoff example', () => {
    const regions = counts(f, 'regions');
    expect(isChipDisabled(regions['Zapadna Evropa'], false)).toBe(true);
    expect(isChipDisabled(regions['Azija'], false)).toBe(true);
    expect(isChipDisabled(counts(f, 'series').side, false)).toBe(true);
    expect(isChipDisabled(regions['Balkan'], false)).toBe(false);
  });

  it('never disables an active chip, so it can always be removed', () => {
    expect(isChipDisabled(0, true)).toBe(false);
  });
});
