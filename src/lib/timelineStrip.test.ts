import { describe, expect, it } from 'vitest';
import { REGION_FAMILIES } from '../config/regionFamilies';
import type { Row } from './timelineLayout';
import { histogram, itemsBelow, railThumb, railToScroll, stripLabels } from './timelineStrip';

describe('histogram', () => {
  const B = { from: 0, to: 90 };

  it('bins anchors over the extent, scaled to 26 px, with a 3 px floor and empty bins at 0', () => {
    const h = histogram([0.5, 0.6, 0.7, 0.8, 50, 89.9], B);
    expect(h).toHaveLength(90);
    expect(h[0]).toBe(26);
    expect(h[50]).toBe(6.5);
    expect(h[89]).toBe(6.5);
    expect(h[1]).toBe(0);
  });

  it('keeps the floor for a lone episode next to a crowded bin', () => {
    const h = histogram([...new Array(40).fill(1), 60], B);
    expect(h[60]).toBe(3);
  });

  it('puts the very end of the extent into the last bin', () => {
    expect(histogram([90], B)[89]).toBeGreaterThan(0);
  });
});

describe('stripLabels', () => {
  it('gives start, the middle rounded to a century, and end', () => {
    expect(stripLabels({ from: -590, to: 2070 })).toEqual([-590, 700, 2070]);
  });
});

describe('railThumb', () => {
  it('is null when the rows fit', () => {
    expect(railThumb({ scrollTop: 0, clientHeight: 300, scrollHeight: 302, railPx: 292 })).toBeNull();
  });

  it('is proportional, and runs from the top to the bottom of the rail', () => {
    expect(railThumb({ scrollTop: 0, clientHeight: 300, scrollHeight: 600, railPx: 292 })).toEqual({ top: 0, height: 146 });
    expect(railThumb({ scrollTop: 300, clientHeight: 300, scrollHeight: 600, railPx: 292 })).toEqual({ top: 146, height: 146 });
  });

  it('never gets shorter than 28 px', () => {
    expect(railThumb({ scrollTop: 0, clientHeight: 100, scrollHeight: 10000, railPx: 92 })?.height).toBe(28);
  });

  it('maps a drag back to scrollTop, clamped', () => {
    const p = { grab: 0, thumb: 146, railPx: 292, clientHeight: 300, scrollHeight: 600 };
    expect(railToScroll({ ...p, y: 73 })).toBe(150);
    expect(railToScroll({ ...p, y: 999 })).toBe(300);
    expect(railToScroll({ ...p, y: -50 })).toBe(0);
  });
});

describe('itemsBelow', () => {
  const row = (lanes: Array<[number, 'normal' | 'outside']>, height: number): Row =>
    ({
      family: REGION_FAMILIES[0], overflow: [], lanes: lanes.length, height, inWindow: 0, total: 0, edge: null, toggle: null,
      placed: lanes.map(([lane, state], i) => ({ lane, state, ep: { id: String(i) } })),
    }) as unknown as Row;

  it('counts in-period items whose top is below the visible bottom', () => {
    // Row 1 tops at 6, 36, 66; row 2 starts at 98 → tops 104, 134.
    const rows = [row([[0, 'normal'], [1, 'normal'], [2, 'normal']], 98), row([[0, 'normal'], [1, 'outside']], 68)];
    expect(itemsBelow(rows, 30, 80)).toBe(1);
    expect(itemsBelow(rows, 30, 40)).toBe(3); // 36, 66 and 104 are past 40 − 6
    expect(itemsBelow(rows, 30, 500)).toBe(0);
  });
});
