import { describe, expect, it } from 'vitest';
import { axisTicks, eraSegments, niceStep, xToYear, yearToX } from './timelineAxis';

describe('niceStep', () => {
  it('takes the first step that gives at least 70 px', () => {
    expect(niceStep(70)).toBe(1);
    expect(niceStep(69)).toBe(2);
    expect(niceStep(3)).toBe(25);
    expect(niceStep(0.5)).toBe(200);
    expect(niceStep(0.07)).toBe(1000);
  });

  it('falls back to 2000 when even 1000 years are narrower than 70 px', () => {
    expect(niceStep(0.05)).toBe(2000);
  });
});

describe('yearToX / xToYear', () => {
  const view = { from: 1000, to: 1500 };

  it('maps the view linearly onto the width, and back', () => {
    expect(yearToX(1000, view, 1000)).toBe(0);
    expect(yearToX(1250, view, 1000)).toBe(500);
    expect(xToYear(500, view, 1000)).toBe(1250);
  });
});

describe('axisTicks', () => {
  it('puts a tick on every step inside the view, with every fifth one major', () => {
    // 1000 px over 500 years = 2 px/year → step 50.
    const ticks = axisTicks({ from: 1010, to: 1510 }, 1000);
    expect(ticks.map((t) => t.year)).toEqual([1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500]);
    expect(ticks.filter((t) => t.major).map((t) => t.year)).toEqual([1250, 1500]);
    expect(ticks[0].x).toBeCloseTo(80);
  });

  it('handles BC years and year 0', () => {
    const ticks = axisTicks({ from: -510, to: 10 }, 520);
    expect(ticks.map((t) => t.year)).toEqual([-500, -400, -300, -200, -100, 0]);
    expect(ticks.filter((t) => t.major).map((t) => t.year)).toEqual([-500, 0]);
  });
});

describe('eraSegments', () => {
  it('returns only the eras in view, clipped to it', () => {
    const segs = eraSegments({ from: 1400, to: 1800 }, 800);
    expect(segs.map((s) => s.era.id)).toEqual(['srednji-vek', 'rani-novi-vek', 'dugi-19']);
    expect(segs[0]).toMatchObject({ x: 0, width: 106 });
    expect(segs[2]).toMatchObject({ x: 778, width: 22 });
  });

  it('labels a segment only when it is wider than 60 px', () => {
    const segs = eraSegments({ from: 1400, to: 1800 }, 800);
    expect(segs.map((s) => s.showLabel)).toEqual([true, true, false]);
  });

  it('copes with the open-ended first and last eras', () => {
    const segs = eraSegments({ from: -600, to: 2050 }, 2650);
    expect(segs[0]).toMatchObject({ x: 0, width: 1200 });
    expect(segs[segs.length - 1]).toMatchObject({ x: 2514, width: 136 });
  });
});
