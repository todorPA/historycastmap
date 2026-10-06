import { describe, expect, it } from 'vitest';
import type { GeoData, HistoryEvent } from '../types/events';
import { deriveEpisodes, episodeLabel, timelineExtent } from './episodeModel';

let n = 0;
function ev(over: Partial<HistoryEvent>): HistoryEvent {
  return {
    id: `e${n++}`, title: { sr: 'Događaj' }, year: 1389, placeId: 'kosovo', episodeId: '1',
    region: 'Balkan', type: 'battle', description: { sr: '' }, confidence: 'high', ...over,
  };
}
function data(events: HistoryEvent[], series: 'main' | 'side' = 'main'): GeoData {
  return {
    meta: { source: 't', generated: '', count: events.length },
    places: [], events,
    episodes: [{ id: '1', title: { sr: 'Test' }, audioUrl: 'x.mp3', series }],
  };
}
const one = (events: HistoryEvent[], series?: 'main' | 'side') => deriveEpisodes(data(events, series))[0];

describe('deriveEpisodes — period', () => {
  it('spans the earliest start to the latest end', () => {
    const e = one([ev({ year: 1331, yearEnd: 1355 }), ev({ year: 1346 })]);
    expect([e.from, e.to]).toEqual([1331, 1355]);
  });

  // §1: "drops legacy chapters such as a 1998 discovery in a medieval episode".
  it('trims an outlier chapter far from the rest', () => {
    const e = one([ev({ year: 1371 }), ev({ year: 1389 }), ev({ year: 1389 }), ev({ year: 1402 }), ev({ year: 1998 })]);
    expect(e.to).toBe(1402);
    expect(e.events).toHaveLength(5); // trimmed from the period, not from the chapters
  });
});

describe('deriveEpisodes — kind and anchor', () => {
  it('is a point when the span is at most one year', () => {
    const e = one([ev({ year: 1389 }), ev({ year: 1390 })]);
    expect(e.kind).toBe('point');
    expect(e.anchor).toBe(1389);
  });

  it('is a range up to 150 years, anchored at the rounded midpoint', () => {
    const e = one([ev({ year: 1300, yearEnd: 1450 })]);
    expect(e.kind).toBe('range');
    expect(e.anchor).toBe(1375);
  });

  it('is long beyond 150 years', () => {
    expect(one([ev({ year: 1300, yearEnd: 1451 })]).kind).toBe('long');
  });

  it('takes its era from the anchor, not from the start', () => {
    expect(one([ev({ year: 1400, yearEnd: 1440 })]).era.id).toBe('srednji-vek'); // anchor 1420
    expect(one([ev({ year: 1440, yearEnd: 1480 })]).era.id).toBe('rani-novi-vek'); // anchor 1460
  });
});

describe('deriveEpisodes — place, row and facets', () => {
  it('uses the most frequent place', () => {
    const e = one([ev({ placeId: 'a' }), ev({ placeId: 'b' }), ev({ placeId: 'b' })]);
    expect(e.placeId).toBe('b');
  });

  // 59 of the 178 real episodes tie; the rule must be deterministic.
  it('breaks a tie by the place whose event is closest to the median year', () => {
    const e = one([ev({ placeId: 'a', year: 1300 }), ev({ placeId: 'b', year: 1350 }), ev({ placeId: 'c', year: 1400 })]);
    expect(e.placeId).toBe('b');
  });

  it('puts the episode in the row of its most frequent region', () => {
    const e = one([ev({ region: 'Afrika' }), ev({ region: 'Bliski istok' }), ev({ region: 'Balkan' }), ev({ region: 'Afrika' })]);
    expect(e.family?.id).toBe('mediteran');
  });

  it('collects every region and type for filtering, including trimmed chapters', () => {
    const e = one([ev({ year: 1389, region: 'Balkan', type: 'battle' }), ev({ year: 1389 }), ev({ year: 1389 }), ev({ year: 1998, region: 'Azija', type: 'other' })]);
    expect([...e.regions].sort()).toEqual(['Azija', 'Balkan']);
    expect([...e.types].sort()).toEqual(['battle', 'other']);
  });

  it('defaults the series to main', () => {
    const d = data([ev({})]);
    delete d.episodes[0].series;
    expect(deriveEpisodes(d)[0].series).toBe('main');
  });

  it('orders chapters by their timestamp in the audio', () => {
    const e = one([ev({ id: 'late', timestamp: '40:00' }), ev({ id: 'early', timestamp: '05:10' }), ev({ id: 'none' })]);
    expect(e.events.map((x) => x.id)).toEqual(['early', 'late', 'none']);
  });
});

describe('deriveEpisodes — overrides', () => {
  it('lets a hand-checked override replace derived values', () => {
    const [e] = deriveEpisodes(data([ev({ year: 1096, placeId: 'toledo' })]), {
      '1': { placeId: 'klermon', dateLabel: { sr: '27. novembar 1095.' }, from: 1095, to: 1099 },
    });
    expect(e.placeId).toBe('klermon');
    expect([e.from, e.to]).toEqual([1095, 1099]);
    expect(e.kind).toBe('range');
    expect(e.dateLabel?.sr).toBe('27. novembar 1095.');
  });
});

describe('deriveEpisodes — override titles', () => {
  it('adds an English title from an override and keeps the Serbian one from the data', () => {
    const [e] = deriveEpisodes(data([ev({})]), { '1': { title: { en: 'The Test' } } });
    expect(e.title).toEqual({ sr: 'Test', en: 'The Test' });
  });

  it('leaves the title alone when the override has none', () => {
    const [e] = deriveEpisodes(data([ev({})]), { '1': { from: 1300 } });
    expect(e.title).toEqual({ sr: 'Test' });
  });
});

describe('timelineExtent (§12.2)', () => {
  it('pads and rounds to the decade, as the prototype shows 550 BC – 2050', () => {
    expect(timelineExtent([{ from: -509, to: 2009 }])).toEqual({ from: -550, to: 2050 });
  });
});

describe('episodeLabel (§1)', () => {
  const lbl = (id: string, series: 'main' | 'side' = 'main') => episodeLabel(id, series, 'sr');
  it('reads the number from the id', () => {
    expect(lbl('43')).toBe('Epizoda 43');
    expect(lbl('09')).toBe('Epizoda 9');
    expect(lbl('05-istorija-lala-historycast-cetvrtkom', 'side')).toBe('Epizoda 5');
  });
  it('names the slot for the side-series slugs', () => {
    expect(lbl('historycast-cetvrtkom-zica', 'side')).toBe('HistoryCast četvrtkom');
    expect(lbl('aja-sofija-historycast-nedeljom', 'side')).toBe('HistoryCast nedeljom');
  });
  it('falls back by series', () => {
    expect(lbl('specijal-istorija-papske-moci-historycast')).toBe('Specijal');
    expect(lbl('radjanje-moderne-umetnosti', 'side')).toBe('Tematska epizoda');
    expect(lbl('novogodisnja-epizoda')).toBe('Epizoda bez broja');
  });
});
