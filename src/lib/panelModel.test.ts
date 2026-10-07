import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { deriveEpisodes } from './episodeModel';
import { EMPTY_FILTERS } from './episodeFilters';
import { activeChips, chronological, episodeDate, groupByEra, universeLine } from './panelModel';
import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data);
const ALL = { from: -Infinity, to: Infinity };

describe('groupByEra', () => {
  const groups = groupByEra(episodes, ALL);

  it('lists the eras in chronological order, every episode exactly once', () => {
    expect(groups.map((g) => g.era.id)).toEqual(['antika', 'srednji-vek', 'rani-novi-vek', 'dugi-19', 'xx']);
    expect(groups.reduce((n, g) => n + g.episodes.length, 0)).toBe(episodes.length);
  });

  it('puts each episode under the era of its anchor', () => {
    for (const g of groups) for (const e of g.episodes) expect(e.era.id, e.id).toBe(g.era.id);
  });

  it('orders each group chronologically', () => {
    for (const g of groups) expect([...g.episodes].sort(chronological)).toEqual(g.episodes);
  });

  it('counts how many of a group overlap the window', () => {
    const medieval = groupByEra(episodes, { from: 1300, to: 1400 }).find((g) => g.era.id === 'srednji-vek')!;
    const expected = medieval.episodes.filter((e) => e.to >= 1300 && e.from <= 1400).length;
    expect(medieval.inWindow).toBe(expected);
    expect(medieval.inWindow).toBeLessThan(medieval.episodes.length);
  });

  it('omits an era with no episodes', () => {
    const onlyMedieval = episodes.filter((e) => e.era.id === 'srednji-vek');
    expect(groupByEra(onlyMedieval, ALL).map((g) => g.era.id)).toEqual(['srednji-vek']);
  });
});

describe('activeChips', () => {
  it('is empty with nothing active', () => {
    expect(activeChips(EMPTY_FILTERS, 'sr')).toEqual([]);
  });

  it('labels each active value, in group order, in the UI language', () => {
    const f = { collections: ['srpski-srednji-vek'], series: ['side' as const], regions: ['Južna Amerika'], types: ['battle'] };
    expect(activeChips(f, 'sr').map((c) => c.label)).toEqual(['Srpski srednji vek', 'Tematske epizode', 'Južna Amerika', 'bitka']);
    expect(activeChips(f, 'en').map((c) => c.label)).toEqual(['Medieval Serbia', 'Thematic episodes', 'South America', 'battle']);
    expect(activeChips(f, 'sr')[0]).toMatchObject({ group: 'collections', value: 'srpski-srednji-vek' });
  });
});

describe('universeLine (§4.2)', () => {
  it('reads count and span off the derived periods', () => {
    expect(universeLine(episodes, 'sr')).toBe('178 epizoda · 499. p.n.e. – 2009');
    expect(universeLine(episodes, 'en')).toBe('178 episodes · 499 BC – 2009');
  });
});

describe('episodeDate', () => {
  const byId = (id: string) => episodes.find((e) => e.id === id)!;
  it('writes a span without spaces, as the list shows it (§7)', () => {
    expect(episodeDate({ ...byId('43'), from: 1331, to: 1355 }, 'sr')).toBe('1331–1355');
  });
  it('writes BC spans in the reader’s language', () => {
    expect(episodeDate({ ...byId('43'), from: -499, to: -479 }, 'sr')).toBe('499. p.n.e.–479. p.n.e.');
    expect(episodeDate({ ...byId('43'), from: -499, to: -479 }, 'en')).toBe('499 BC–479 BC');
  });
  it('writes a single year once', () => {
    expect(episodeDate({ ...byId('43'), from: 1389, to: 1389 }, 'sr')).toBe('1389');
  });
  it('prefers a hand-checked date label', () => {
    expect(episodeDate({ ...byId('43'), dateLabel: { sr: '28. jun 1389.', en: '28 June 1389' } }, 'en')).toBe('28 June 1389');
  });
});
