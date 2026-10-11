import { describe, expect, it } from 'vitest';
import { ERAS } from '../config/eras';
import { centreView, clampView, easeInOutCubic, eraView, moveView, resizeView, selectionView, zoomView } from './timelineWindow';

const B = { from: -590, to: 2070 };

describe('clampView', () => {
  it('keeps a view inside the bounds by shifting it, not shrinking it', () => {
    expect(clampView(-700, -400, B)).toEqual({ from: -590, to: -290 });
    expect(clampView(2000, 2200, B)).toEqual({ from: 1870, to: 2070 });
  });

  it('holds the span to at least 8 years and at most the bounds', () => {
    expect(clampView(1000, 1002, B)).toEqual({ from: 1000, to: 1008 });
    expect(clampView(-5000, 5000, B)).toEqual(B);
  });

  it('accepts a reversed pair', () => {
    expect(clampView(1500, 1400, B)).toEqual({ from: 1400, to: 1500 });
  });
});

describe('zoomView', () => {
  it('zooms around the centre', () => {
    expect(zoomView({ from: 1000, to: 1500 }, 0.6, B)).toEqual({ from: 1100, to: 1400 });
  });

  it('zooming out past the bounds stops at the bounds', () => {
    expect(zoomView({ from: -500, to: 2000 }, 1 / 0.6, B)).toEqual(B);
  });
});

describe('centreView', () => {
  it('centres the window on a year, keeping its span', () => {
    expect(centreView({ from: 1000, to: 1200 }, 1500, B)).toEqual({ from: 1400, to: 1600 });
  });

  it('stays inside the bounds near an edge', () => {
    expect(centreView({ from: 1000, to: 1200 }, 2060, B)).toEqual({ from: 1870, to: 2070 });
  });
});

describe('moveView / resizeView', () => {
  const start = { from: 1000, to: 1200 };

  it('moves the body by a number of years', () => {
    expect(moveView(start, 50, B)).toEqual({ from: 1050, to: 1250 });
    expect(moveView(start, -5000, B)).toEqual({ from: -590, to: -390 });
  });

  it('resizes from either handle without crossing the 8-year minimum', () => {
    expect(resizeView(start, 'l', 100, B)).toEqual({ from: 1100, to: 1200 });
    expect(resizeView(start, 'l', 500, B)).toEqual({ from: 1192, to: 1200 });
    expect(resizeView(start, 'r', -500, B)).toEqual({ from: 1000, to: 1008 });
    expect(resizeView(start, 'r', 5000, B)).toEqual({ from: 1000, to: 2070 });
  });
});

describe('selectionView', () => {
  const ep = (from: number, to: number, anchor = (from + to) / 2) => ({ from, to, anchor });

  it('narrows a wide window to three times the episode, at least 320 years, on its anchor', () => {
    expect(selectionView({ from: -590, to: 2070 }, ep(1331, 1355, 1343), B)).toEqual({ from: 1183, to: 1503 });
    expect(selectionView({ from: -590, to: 2070 }, ep(1000, 1199, 1100), B)).toEqual({ from: 800, to: 1400 });
  });

  it('reframes when the episode is longer than 80% of the window', () => {
    expect(selectionView({ from: 1300, to: 1400 }, ep(1300, 1390, 1345), B)).toEqual({ from: 1185, to: 1505 });
  });

  it('only recentres, keeping the span, when the episode is within 10% of an edge', () => {
    expect(selectionView({ from: 1000, to: 1400 }, ep(1380, 1390, 1385), B)).toEqual({ from: 1185, to: 1585 });
    expect(selectionView({ from: 1000, to: 1400 }, ep(1010, 1020, 1015), B)).toEqual({ from: 815, to: 1215 });
  });

  it('leaves the window alone when the episode already sits comfortably inside', () => {
    expect(selectionView({ from: 1000, to: 1400 }, ep(1150, 1250), B)).toBeNull();
  });

  it('keeps the new window inside the bounds', () => {
    expect(selectionView({ from: -590, to: 2070 }, ep(2000, 2009), B)).toEqual({ from: 1750, to: 2070 });
  });
});

describe('eraView', () => {
  it('frames an era with 4% either side, clamped to the bounds', () => {
    const mid = ERAS.find((e) => e.id === 'srednji-vek')!;
    const v = eraView(mid, B);
    expect(v.from).toBeCloseTo(600 - 853 * 0.04);
    expect(v.to).toBeCloseTo(1453 + 853 * 0.04);
  });

  // Antiquity starts at -Infinity: cut to the bounds, padded, then shifted back inside them
  // (the padded span is kept, as everywhere in clampView).
  it('cuts the open-ended eras at the bounds first', () => {
    const v = eraView(ERAS[0], B);
    expect(v.from).toBe(-590);
    expect(v.to).toBeCloseTo(-590 + 1190 * 1.08);
  });
});

describe('easeInOutCubic', () => {
  it('starts at 0, ends at 1, passes 0.5 at the midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625);
  });
});
