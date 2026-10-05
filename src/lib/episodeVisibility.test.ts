import { describe, expect, it } from 'vitest';
import type { GeoData, HistoryEvent } from '../types/events';
import { indexById } from '../types/events';
import { COLLECTIONS } from '../config/collections';
import { deriveEpisodes } from './episodeModel';
import { EMPTY_FILTERS, collectionMembers } from './episodeFilters';
import { matchingEpisodes, overlaps, visibleEvents } from './episodeVisibility';
import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data);
const members = collectionMembers(COLLECTIONS);
const places = indexById(data.places);
const ids = (eps: { id: string }[]) => eps.map((e) => e.id);

describe('matchingEpisodes', () => {
  it('is everything with no filters and no query', () => {
    expect(matchingEpisodes(episodes, EMPTY_FILTERS, members, '', places, 'sr', null)).toHaveLength(episodes.length);
  });

  it('ANDs the search on top of the filters', () => {
    const f = { ...EMPTY_FILTERS, collections: ['srpski-srednji-vek'] };
    const all = matchingEpisodes(episodes, f, members, '', places, 'sr', null);
    const lazar = matchingEpisodes(episodes, f, members, 'lazar', places, 'sr', null);
    expect(all).toHaveLength(12);
    expect(lazar.length).toBeGreaterThan(0);
    expect(lazar.length).toBeLessThan(12);
    expect(ids(lazar).every((id) => ids(all).includes(id))).toBe(true);
  });

  // §6.5: "The currently selected episode stays visible even if a filter excludes it."
  it('keeps the selected episode even when the filters exclude it', () => {
    const f = { ...EMPTY_FILTERS, collections: ['azija'] };
    expect(ids(matchingEpisodes(episodes, f, members, '', places, 'sr', null))).not.toContain('43');
    expect(ids(matchingEpisodes(episodes, f, members, '', places, 'sr', '43'))).toContain('43');
  });
});

describe('overlaps', () => {
  const window = { from: 1300, to: 1400 };
  it('counts a span that touches either edge', () => {
    expect(overlaps(1250, 1300, window)).toBe(true);
    expect(overlaps(1400, 1450, window)).toBe(true);
    expect(overlaps(1250, 1450, window)).toBe(true);
  });
  it('excludes a span entirely outside', () => {
    expect(overlaps(1200, 1299, window)).toBe(false);
    expect(overlaps(1401, 1500, window)).toBe(false);
  });
});

describe('visibleEvents', () => {
  const ev = (id: string, episodeId: string, year: number, yearEnd?: number): HistoryEvent =>
    ({ id, episodeId, year, yearEnd, title: { sr: id }, placeId: 'p', description: { sr: '' }, confidence: 'high' }) as HistoryEvent;
  const events = [ev('a', '1', 1350), ev('b', '1', 1500), ev('c', '2', 1360), ev('d', '3', 1200, 1380)];
  const all = { from: -Infinity, to: Infinity };

  it('draws every chapter of every matching episode', () => {
    expect(ids(visibleEvents(events, new Set(['1', '3']), null, all))).toEqual(['a', 'b', 'd']);
  });

  it('keeps only chapters that overlap the window, spans included', () => {
    expect(ids(visibleEvents(events, new Set(['1', '2', '3']), null, { from: 1340, to: 1400 }))).toEqual(['a', 'c', 'd']);
  });

  // Interim until Phase 3: a selection narrows the old map and timeline to that episode.
  it('narrows to the selected episode', () => {
    expect(ids(visibleEvents(events, new Set(['1', '2', '3']), '2', all))).toEqual(['c']);
  });
});
