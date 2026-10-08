import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { EPISODE_OVERRIDES } from '../config/episodeOverrides';
import { REGION_FAMILIES } from '../config/regionFamilies';
import { ERAS } from '../config/eras';
import { deriveEpisodes, timelineExtent } from './episodeModel';
import { markerState } from './episodeMarkers';
import { buildRows, itemTop, labelInk, layoutItem, packRow, type ItemLayout, type LayoutEpisode, type Measure } from './timelineLayout';
import shipped from '../../public/data/geo-events.json';

/** Every character 7 px wide; bold 8. */
const measure: Measure = (t, bold) => t.length * (bold ? 8 : 7);
const view = { from: 1000, to: 2000 };
const ctx = { view, widthPx: 1000, measure }; // 1 px per year
const balkan = REGION_FAMILIES[0];
const ep = (o: Partial<LayoutEpisode> & { id: string }): LayoutEpisode => ({
  from: 1300, to: 1300, kind: 'point', anchor: 1300, family: balkan, ...o,
});
const text = { title: 'Kosovo', date: '1389' }; // 42 px; 48 bold; date 28

describe('layoutItem', () => {
  it('centres a point diamond on its year with the label to its right', () => {
    const it = layoutItem(ep({ id: 'a', from: 1389, to: 1389, anchor: 1389 }), text, 'normal', ctx);
    expect(it).toMatchObject({ m0: 382, m1: 396, lx: 400, lw: 42, inside: false, e0: 382, e1: 452 });
  });

  it('draws a bar from `from` to `to + 1`', () => {
    const it = layoutItem(ep({ id: 'b', from: 1300, to: 1309, kind: 'range', anchor: 1305 }), text, 'normal', ctx);
    expect(it).toMatchObject({ m0: 300, m1: 310, xa: 305.5 });
  });

  it('puts the label inside a bar wide enough for it plus 18 px, and outside otherwise', () => {
    // The label is 42 px, so the bar must be wider than 60 px: 61 is, 60 is not.
    const wide = layoutItem(ep({ id: 'c', from: 1300, to: 1360, kind: 'range' }), text, 'normal', ctx);
    expect(wide).toMatchObject({ inside: true, lx: 308, e0: 300, e1: 361 });
    const narrow = layoutItem(ep({ id: 'd', from: 1300, to: 1359, kind: 'range' }), text, 'normal', ctx);
    expect(narrow).toMatchObject({ inside: false, lx: 366 });
  });

  it('sticks an inside label to the visible left edge when the bar starts off-screen', () => {
    const it = layoutItem(ep({ id: 'e', from: 900, to: 1200, kind: 'long' }), text, 'normal', ctx);
    expect(it).toMatchObject({ inside: true, lx: 10 });
  });

  it('gives a bar at least 6 px', () => {
    const it = layoutItem(ep({ id: 'f', from: 1500, to: 1500, kind: 'range' }), text, 'normal', { ...ctx, widthPx: 100 });
    expect(it.m1 - it.m0).toBe(6);
  });

  it('adds the date for hover and selection, and the selection is bold', () => {
    const p = ep({ id: 'g', from: 1389, to: 1389, anchor: 1389 });
    expect(layoutItem(p, text, 'hover', ctx).lw).toBe(42 + 12 + 28);
    expect(layoutItem(p, text, 'selected', ctx).lw).toBe(48 + 12 + 28);
  });

  it('caps the title at 280 px', () => {
    const it = layoutItem(ep({ id: 'h' }), { title: 'x'.repeat(100), date: '' }, 'normal', ctx);
    expect(it.lw).toBe(280);
  });
});

describe('packRow', () => {
  const box = (id: string, e0: number, e1: number, state: ItemLayout['state'] = 'normal'): ItemLayout =>
    ({ ep: ep({ id }), state, m0: e0, m1: e0, xa: e0, lx: e0, lw: 0, inside: false, e0, e1 });

  it('fills lanes first-fit, left to right', () => {
    const r = packRow([box('a', 0, 100), box('b', 50, 150), box('c', 120, 200)], 3);
    expect(r.placed.map((p) => [p.ep.id, p.lane])).toEqual([['a', 0], ['b', 1], ['c', 0]]);
    expect(r.lanes).toBe(2);
  });

  it('sends what does not fit under the cap to overflow', () => {
    const r = packRow([box('a', 0, 100), box('b', 0, 100), box('c', 0, 100)], 2);
    expect(r.placed.map((p) => p.ep.id)).toEqual(['a', 'b']);
    expect(r.overflow.map((p) => p.ep.id)).toEqual(['c']);
  });

  it('packs in priority order: selected, hovered, normal, muted, outside', () => {
    const r = packRow([box('out', 0, 10, 'outside'), box('mut', 0, 10, 'muted'), box('nor', 0, 10, 'normal'), box('hov', 0, 10, 'hover'), box('sel', 0, 10, 'selected')], 3);
    expect(r.placed.map((p) => p.ep.id)).toEqual(['sel', 'hov', 'nor']);
    expect(r.overflow.map((p) => p.ep.id)).toEqual(['mut', 'out']);
  });

  it('always gives the selection a lane, past the cap if it must', () => {
    const r = packRow([box('a', 0, 10), box('b', 0, 10), box('s', 0, 10, 'selected')], 1);
    expect(r.placed.find((p) => p.ep.id === 's')?.lane).toBe(0);
  });
});

describe('buildRows', () => {
  const base = {
    view, window: view, widthPx: 1000, measure, lanePx: 30, cap: 3, expanded: new Set<string>(), selectedId: null,
    stateOf: () => 'normal' as const, text: () => text,
  };

  it('gives one row per family that has episodes, in family order', () => {
    const asia = REGION_FAMILIES.find((f) => f.id === 'azija')!;
    const rows = buildRows([ep({ id: 'x', family: asia }), ep({ id: 'y' })], base);
    expect(rows.map((r) => r.family.id)).toEqual(['balkan', 'azija']);
  });

  it('counts the row against the window, and the height from the lanes', () => {
    const rows = buildRows([ep({ id: 'a', from: 1100, to: 1100, anchor: 1100 }), ep({ id: 'b', from: 1900, to: 1900, anchor: 1900 })], { ...base, window: { from: 1000, to: 1500 } });
    expect(rows[0]).toMatchObject({ inWindow: 1, total: 2, lanes: 1, height: 38, toggle: null });
  });

  it('adds the overflow strip and the +N toggle when a row overflows, and Skupi when expanded', () => {
    const many = ['a', 'b', 'c', 'd'].map((id) => ep({ id }));
    const capped = buildRows(many, base)[0];
    expect(capped).toMatchObject({ lanes: 3, height: 3 * 30 + 8 + 12, toggle: 'more' });
    expect(capped.overflow).toHaveLength(1);
    const open = buildRows(many, { ...base, expanded: new Set(['balkan']) })[0];
    expect(open).toMatchObject({ lanes: 4, toggle: 'less' });
    expect(open.overflow).toHaveLength(0);
  });

  it('shows the edge pill when the selection is off one side of the view', () => {
    const sel = ep({ id: 's', from: 500, to: 600, kind: 'range', anchor: 550 });
    expect(buildRows([sel], { ...base, selectedId: 's' })[0].edge).toBe('l');
    const later = ep({ id: 's', from: 2100, to: 2100, anchor: 2100 });
    expect(buildRows([later], { ...base, selectedId: 's' })[0].edge).toBe('r');
  });

  it('does not count an episode that is shown only because it is selected', () => {
    const rows = buildRows([ep({ id: 'a' }), ep({ id: 's' })], { ...base, selectedId: 's', matches: (e) => e.id !== 's' });
    expect(rows[0]).toMatchObject({ total: 1, inWindow: 1 });
  });

  it('places items in lane tops of 4 + lane·lanePx + 2', () => {
    expect(itemTop(0, 30)).toBe(6);
    expect(itemTop(2, 24)).toBe(54);
  });
});

describe('buildRows over the real data', () => {
  const episodes = deriveEpisodes(shipped as unknown as GeoData, EPISODE_OVERRIDES);
  const bounds = timelineExtent(episodes);
  const measureReal: Measure = (t, bold) => t.length * (bold ? 7.6 : 7.1);

  for (const [label, v] of [['full extent', bounds], ['the 14th century', { from: 1300, to: 1400 }]] as const) {
    it(`never overlaps two items in a lane, and keeps the selection, at ${label}`, () => {
      const selectedId = '43';
      const rows = buildRows(episodes, {
        view: v, window: v, widthPx: 1200, measure: measureReal, lanePx: 30, cap: 3, expanded: new Set(), selectedId,
        stateOf: (e) => markerState(e as never, { selectedId, hoveredId: null, range: v }),
        text: (e) => ({ title: e.title.sr, date: String(e.from) }),
      });
      for (const r of rows) {
        for (const a of r.placed) for (const b of r.placed) {
          if (a !== b && a.lane === b.lane) expect(a.e0 >= b.e1 || a.e1 <= b.e0).toBe(true);
        }
      }
      const all = rows.flatMap((r) => r.placed.map((p) => p.ep.id));
      expect(all).toContain(selectedId);
      expect(new Set(all).size).toBe(all.length);
    });
  }
});

describe('labelInk', () => {
  it('picks ink or white, whichever reads better, for every era colour', () => {
    expect(ERAS.map((e) => labelInk(e.color))).toEqual(['#FFFFFF', '#FFFFFF', '#1B130D', '#1B130D', '#FFFFFF']);
  });
});
