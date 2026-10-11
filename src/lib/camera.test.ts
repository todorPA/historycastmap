import { describe, expect, it } from 'vitest';
import { ERAS } from '../config/eras';
import { eraWindow, flyTarget, project, unproject } from './camera';

describe('Web Mercator', () => {
  it('round-trips a point at any zoom', () => {
    for (const z of [2, 5, 9]) {
      const [lat, lng] = unproject(project([44.82, 20.46], z), z);
      expect(lat).toBeCloseTo(44.82, 9);
      expect(lng).toBeCloseTo(20.46, 9);
    }
  });
  it('matches Leaflet’s EPSG:3857 pixel origin', () => {
    expect(project([0, 0], 0)).toEqual([128, 128]);
    expect(project([0, -180], 1)[0]).toBeCloseTo(0, 9);
  });
});

describe('flyTarget (§10.1)', () => {
  const beograd: [number, number] = [44.82, 20.46];

  it('clamps the zoom to 4.5–6', () => {
    expect(flyTarget(beograd, { zoom: 3, mapWidthPx: 1200, cardOpen: true }).zoom).toBe(4.5);
    expect(flyTarget(beograd, { zoom: 9, mapWidthPx: 1200, cardOpen: true }).zoom).toBe(6);
    expect(flyTarget(beograd, { zoom: 5.2, mapWidthPx: 1200, cardOpen: true }).zoom).toBe(5.2);
  });

  // The card covers the right of the map, so the episode must land left of centre: the centre
  // sits to its right by min(196 px, 25% of the width).
  it('puts the episode left of centre by min(196 px, 25% of the width) while the card is open', () => {
    for (const width of [1600, 600]) {
      const { center, zoom } = flyTarget(beograd, { zoom: 5, mapWidthPx: width, cardOpen: true });
      const dx = project(center, zoom)[0] - project(beograd, zoom)[0];
      const dy = project(center, zoom)[1] - project(beograd, zoom)[1];
      expect(dx).toBeCloseTo(Math.min(196, width * 0.25), 6);
      expect(dy).toBeCloseTo(0, 6);
    }
  });

  it('centres on the episode with no card', () => {
    const { center } = flyTarget(beograd, { zoom: 5, mapWidthPx: 1600, cardOpen: false });
    expect(center[0]).toBeCloseTo(beograd[0], 9);
    expect(center[1]).toBeCloseTo(beograd[1], 9);
  });
});

describe('eraWindow', () => {
  const extent = { from: -550, to: 2050 };
  it('is the era, clamped to the data extent', () => {
    expect(eraWindow(ERAS.find((e) => e.id === 'srednji-vek')!, extent)).toEqual({ from: 600, to: 1453 });
    expect(eraWindow(ERAS.find((e) => e.id === 'antika')!, extent)).toEqual({ from: -550, to: 600 });
    expect(eraWindow(ERAS.find((e) => e.id === 'xx')!, extent)).toEqual({ from: 1914, to: 2050 });
  });
});
