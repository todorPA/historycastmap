import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { deriveEpisodes } from './episodeModel';
import { EPISODE_OVERRIDES } from '../config/episodeOverrides';
import { ERAS } from '../config/eras';
import { chapterPins, clusterClick, clusterSize, eraRing, markerState } from './episodeMarkers';
import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data, EPISODE_OVERRIDES);
const byId = (id: string) => episodes.find((e) => e.id === id)!;
const ALL = { from: -Infinity, to: Infinity };

describe('markerState (§9.1, §11)', () => {
  const lazar = byId('43'); // 1329–1375
  const s = (o: Partial<{ selectedId: string | null; hoveredId: string | null; range: { from: number; to: number } }>) =>
    markerState(lazar, { selectedId: null, hoveredId: null, range: ALL, ...o });

  it('is normal with nothing selected or hovered', () => expect(s({})).toBe('normal'));
  it('is selected when it is the selection, whatever else holds', () => {
    expect(s({ selectedId: '43', hoveredId: '43', range: { from: 1900, to: 2000 } })).toBe('selected');
  });
  it('is hovered, even outside the window, so its label can show', () => {
    expect(s({ hoveredId: '43', range: { from: 1900, to: 2000 } })).toBe('hover');
  });
  it('is outside when its period misses the window', () => expect(s({ range: { from: 1400, to: 1500 } })).toBe('outside'));
  it('is muted when another episode is selected', () => expect(s({ selectedId: '95' })).toBe('muted'));
  it('stays outside, not muted, when another is selected and it misses the window', () => {
    expect(s({ selectedId: '95', range: { from: 1400, to: 1500 } })).toBe('outside');
  });
});

describe('clusterSize', () => {
  it('follows 24 + min(22, 5·log2 n)', () => {
    expect(clusterSize(2)).toBe(29);
    expect(clusterSize(8)).toBe(39);
    expect(clusterSize(1000)).toBe(46);
  });
});

describe('eraRing', () => {
  const era = (id: string) => ({ era: ERAS.find((e) => e.id === id)! });
  it('is one solid colour for a one-era cluster', () => {
    expect(eraRing([era('antika'), era('antika')])).toBe(`conic-gradient(${ERAS[0].color} 0% 100%)`);
  });
  it('gives each era a share in era order, however the members are ordered', () => {
    const ring = eraRing([era('xx'), era('antika'), era('xx'), era('xx')]);
    expect(ring).toBe(`conic-gradient(${ERAS[0].color} 0% 25%, ${ERAS[4].color} 25% 100%)`);
  });
});

describe('clusterClick (§9.1)', () => {
  // Phase 2's bug in a new form would be a click that neither zooms nor opens a list.
  it('always gains zoom below 6.5, and never past 7', () => {
    for (let zoom = 2; zoom < 6.5; zoom += 0.25) {
      for (const fitZoom of [zoom, zoom + 0.5, zoom + 3, 12]) {
        const r = clusterClick({ zoom, fitZoom, maxZoom: 18 });
        expect(r, `z${zoom} fit${fitZoom}`).not.toBe('list');
        if (r !== 'list') {
          expect(r.zoomTo, `z${zoom} fit${fitZoom}`).toBeGreaterThan(zoom);
          expect(r.zoomTo).toBeLessThanOrEqual(7);
        }
      }
    }
  });

  it('opens the list from 6.5 up', () => {
    expect(clusterClick({ zoom: 6.5, fitZoom: 10, maxZoom: 18 })).toBe('list');
    expect(clusterClick({ zoom: 9, fitZoom: 12, maxZoom: 18 })).toBe('list');
  });

  // Belgrade holds 34 episodes on one point: zooming can never separate them.
  it('opens the list at any zoom when the members are one point', () => {
    expect(clusterClick({ zoom: 3, fitZoom: 18, maxZoom: 18 })).toBe('list');
  });
});

describe('chapterPins', () => {
  it('gives one pin per chapter place, in audio order, numbered by its first chapter', () => {
    const ep = byId('43'); // three chapters, all at Prilepac
    const pins = chapterPins(ep);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({ placeId: 'prilepac', number: 1 });
    expect(pins[0].eventIds).toEqual(ep.events.map((e) => e.id));
  });

  it('numbers pins by chapter, so a place first reached later gets a later number', () => {
    const ep = episodes.find((e) => new Set(e.events.map((x) => x.placeId)).size >= 3)!;
    const pins = chapterPins(ep);
    const firstIndex = (placeId: string) => ep.events.findIndex((e) => e.placeId === placeId) + 1;
    expect(pins.map((p) => p.number)).toEqual(pins.map((p) => firstIndex(p.placeId)));
    expect(pins.map((p) => p.number)).toEqual([...pins.map((p) => p.number)].sort((a, b) => a - b));
  });
});
