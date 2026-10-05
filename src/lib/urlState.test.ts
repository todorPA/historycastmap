import { describe, expect, it } from 'vitest';
import { buildSearch, parseUrlState } from './urlState';

const DEFAULTS = {
  dataset: 'full' as const,
  from: -1200,
  to: 2009,
  isFullRange: true,
  collections: [],
  episodeId: null,
  eventId: null,
  lang: 'sr' as const,
  basemapId: 'osm',
  regions: [],
  types: [],
  series: [],
};

describe('parseUrlState — facets are allow-listed', () => {
  // One unknown value would otherwise AND into visibility and empty the map with no cause
  // the reader could see.
  it('drops unknown regions and keeps the known ones', () => {
    expect(parseUrlState('?r=Balkan,Atlantida').regions).toEqual(['Balkan']);
  });

  it('degrades to no restriction when nothing survives, never to "match nothing"', () => {
    expect(parseUrlState('?r=Atlantida').regions).toBeNull();
    expect(parseUrlState('?ty=picnic').types).toBeNull();
    expect(parseUrlState('?se=podcast').series).toBeNull();
  });

  it('decodes regions with diacritics and spaces', () => {
    expect(parseUrlState('?r=Ju%C5%BEna%20Amerika').regions).toEqual(['Južna Amerika']);
  });

  it('keeps known types and series', () => {
    expect(parseUrlState('?ty=battle,picnic,siege').types).toEqual(['battle', 'siege']);
    expect(parseUrlState('?se=side').series).toEqual(['side']);
  });
});

describe('parseUrlState — collections', () => {
  it('reads several collections from one parameter', () => {
    expect(parseUrlState('?col=srpski-srednji-vek,moderna-srbija').collections).toEqual(['srpski-srednji-vek', 'moderna-srbija']);
  });

  // Links shared before collections became multi-select carried exactly one id.
  it('still opens a legacy single-collection link', () => {
    expect(parseUrlState('?col=antika').collections).toEqual(['antika']);
  });

  it('drops collections that do not exist, and keeps the rest', () => {
    expect(parseUrlState('?col=antika,nepostojeca').collections).toEqual(['antika']);
    expect(parseUrlState('?col=nepostojeca').collections).toBeNull();
  });
});

describe('parseUrlState — other fields', () => {
  it('accepts integer years only, BC negative', () => {
    expect(parseUrlState('?from=-480&to=1389')).toMatchObject({ from: -480, to: 1389 });
    expect(parseUrlState('?from=1.5').from).toBeNull();
    expect(parseUrlState('?from=abc').from).toBeNull();
  });

  it('accepts only the two languages', () => {
    expect(parseUrlState('?lang=en').lang).toBe('en');
    expect(parseUrlState('?lang=de').lang).toBeNull();
  });

  // `in` would match inherited keys, so ?data=toString resolved to a function, not a path.
  it('does not treat an inherited property name as a dataset', () => {
    expect(parseUrlState('?data=toString').dataset).toBe('full');
    expect(parseUrlState('?data=sample').dataset).toBe('sample');
  });

  it('ignores an unknown basemap', () => {
    expect(parseUrlState('?bm=nonexistent').basemapId).toBeNull();
  });
});

describe('buildSearch', () => {
  it('writes nothing for the default view, so shared links stay short', () => {
    expect(buildSearch(DEFAULTS)).toBe('');
  });

  it('round-trips the facets through parseUrlState', () => {
    const search = buildSearch({
      ...DEFAULTS,
      regions: ['Južna Amerika', 'Balkan'],
      types: ['battle'],
      series: ['side'],
      collections: ['antika', 'azija'],
      lang: 'en',
    });
    expect(parseUrlState(search)).toMatchObject({
      collections: ['antika', 'azija'],
      regions: ['Južna Amerika', 'Balkan'],
      types: ['battle'],
      series: ['side'],
      lang: 'en',
    });
  });

  it('spells out the range only when it is not the full range', () => {
    const search = buildSearch({ ...DEFAULTS, isFullRange: false, from: -480, to: 1389 });
    expect(parseUrlState(search)).toMatchObject({ from: -480, to: 1389 });
  });
});
