import { describe, expect, it } from 'vitest';
import type { HistoryEvent } from '../types/events';
import { isVisible } from './visibility';
import type { VisibilityFilters } from './visibility';

function event(over: Partial<HistoryEvent>): HistoryEvent {
  return {
    id: 'e',
    title: { sr: 'Događaj' },
    year: 1389,
    placeId: 'kosovo',
    episodeId: '43',
    region: 'Balkan',
    type: 'battle',
    description: { sr: '' },
    confidence: 'high',
    ...over,
  };
}

const ALL: VisibilityFilters = {
  activeEpisodeId: null,
  activeRegions: [],
  activeTypes: [],
  range: { from: -Infinity, to: Infinity },
};
const within = (from: number, to: number): VisibilityFilters => ({ ...ALL, range: { from, to } });

describe('isVisible — year range', () => {
  it('shows a point event inside the range, inclusive at both ends', () => {
    expect(isVisible(event({ year: 1389 }), within(1389, 1400))).toBe(true);
    expect(isVisible(event({ year: 1400 }), within(1389, 1400))).toBe(true);
    expect(isVisible(event({ year: 1401 }), within(1389, 1400))).toBe(false);
  });

  // A reign that began before the window but is still running inside it belongs on the map.
  it('shows a span that overlaps the range even when it starts before it', () => {
    const reign = event({ year: 1331, yearEnd: 1355 });
    expect(isVisible(reign, within(1350, 1400))).toBe(true);
    expect(isVisible(reign, within(1356, 1400))).toBe(false);
  });

  it('handles BC years as negative integers', () => {
    expect(isVisible(event({ year: -480 }), within(-500, -400))).toBe(true);
    expect(isVisible(event({ year: -480 }), within(1, 100))).toBe(false);
  });
});

describe('isVisible — facets', () => {
  it('ORs values within a facet', () => {
    const f = { ...ALL, activeRegions: ['Balkan', 'Azija'] };
    expect(isVisible(event({ region: 'Azija' }), f)).toBe(true);
    expect(isVisible(event({ region: 'Afrika' }), f)).toBe(false);
  });

  it('ANDs across facets', () => {
    const f = { ...ALL, activeRegions: ['Balkan'], activeTypes: ['battle'] };
    expect(isVisible(event({ region: 'Balkan', type: 'battle' }), f)).toBe(true);
    expect(isVisible(event({ region: 'Balkan', type: 'treaty' }), f)).toBe(false);
  });

  it('treats an empty facet as no restriction', () => {
    expect(isVisible(event({ region: undefined, type: undefined }), ALL)).toBe(true);
  });

  it('narrows to one episode, and to a collection of episodes', () => {
    expect(isVisible(event({ episodeId: '43' }), { ...ALL, activeEpisodeId: '44' })).toBe(false);
    const collection = new Set(['9', '43']);
    expect(isVisible(event({ episodeId: '43' }), { ...ALL, activeCollectionEpisodes: collection })).toBe(true);
    expect(isVisible(event({ episodeId: '44' }), { ...ALL, activeCollectionEpisodes: collection })).toBe(false);
  });
});

describe('isVisible — series', () => {
  // Series lives on the episode, not the event, so it is looked up through the set.
  const sideEpisodeIds = new Set(['115']);

  it('filters by the series of the event’s episode', () => {
    const side = { ...ALL, activeSeries: ['side' as const], sideEpisodeIds };
    expect(isVisible(event({ episodeId: '115' }), side)).toBe(true);
    expect(isVisible(event({ episodeId: '43' }), side)).toBe(false);

    const main = { ...ALL, activeSeries: ['main' as const], sideEpisodeIds };
    expect(isVisible(event({ episodeId: '43' }), main)).toBe(true);
  });

  it('shows everything when both series are selected', () => {
    const both = { ...ALL, activeSeries: ['main' as const, 'side' as const], sideEpisodeIds };
    expect(isVisible(event({ episodeId: '115' }), both)).toBe(true);
    expect(isVisible(event({ episodeId: '43' }), both)).toBe(true);
  });

  // Datasets that predate the series field have no side set; everything reads as main.
  it('reads every episode as main when no side set is given', () => {
    expect(isVisible(event({ episodeId: '115' }), { ...ALL, activeSeries: ['main'] })).toBe(true);
    expect(isVisible(event({ episodeId: '115' }), { ...ALL, activeSeries: ['side'] })).toBe(false);
  });
});
