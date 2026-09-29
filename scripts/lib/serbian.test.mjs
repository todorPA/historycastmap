import { describe, expect, it } from 'vitest';
import { agree, emptyCenturiesPhrase, numberWord } from './serbian.mjs';

const EPIZODA = ['epizoda', 'epizode', 'epizoda'];
const DOGADJAJ = ['istorijski događaj', 'istorijska događaja', 'istorijskih događaja'];

describe('agree — Serbian numeral agreement', () => {
  it('takes the singular after a final 1', () => {
    expect(agree(1, DOGADJAJ)).toBe('istorijski događaj');
    expect(agree(21, DOGADJAJ)).toBe('istorijski događaj');
    expect(agree(741, DOGADJAJ)).toBe('istorijski događaj');
  });

  it('takes the paucal after a final 2, 3 or 4', () => {
    for (const n of [2, 3, 4, 22, 104, 742]) expect(agree(n, DOGADJAJ)).toBe('istorijska događaja');
  });

  it('takes the genitive plural after 5–9 and 0', () => {
    for (const n of [5, 9, 10, 20, 100, 178]) expect(agree(n, EPIZODA)).toBe('epizoda');
  });

  // The rule most easily got wrong: the teens ignore their final digit.
  it('takes the genitive plural for 11–14, whatever the final digit', () => {
    for (const n of [11, 12, 13, 14, 111, 112, 114]) expect(agree(n, DOGADJAJ)).toBe('istorijskih događaja');
  });

  // The regression that motivated generating the copy at all.
  it('does not reproduce "178 epizode"', () => {
    expect(`178 ${agree(178, ['epizoda', 'epizode', 'epizoda'])}`).toBe('178 epizoda');
    expect(`102 ${agree(102, ['epizoda', 'epizode', 'epizoda'])}`).toBe('102 epizode');
  });
});

describe('numberWord', () => {
  it('spells out up to twenty and falls back to digits', () => {
    expect(numberWord(7)).toBe('sedam');
    expect(numberWord(20)).toBe('dvadeset');
    expect(numberWord(21)).toBe('21');
  });
});

describe('emptyCenturiesPhrase — the chart caption', () => {
  it('agrees noun and verb with the count', () => {
    expect(emptyCenturiesPhrase(1)).toBe('jedan vek nema');
    expect(emptyCenturiesPhrase(3)).toBe('tri veka nemaju');
    expect(emptyCenturiesPhrase(7)).toBe('sedam vekova nema');
  });

  it('treats the teens as plural, like agree()', () => {
    expect(emptyCenturiesPhrase(12)).toBe('dvanaest vekova nema');
    expect(emptyCenturiesPhrase(13)).toBe('trinaest vekova nema');
  });

  // Past twenty the caption used its own ad-hoc rule instead of agree(), and the two disagreed.
  it('follows the final digit past twenty', () => {
    expect(emptyCenturiesPhrase(21)).toBe('21 vek nema');
    expect(emptyCenturiesPhrase(22)).toBe('22 veka nemaju');
  });
});
