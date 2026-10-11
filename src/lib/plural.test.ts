import { describe, expect, it } from 'vitest';
import { agreeSr, episodeCount, episodeNoun, moreBelowLabel } from './plural';

describe('episodeCount', () => {
  it.each([
    [1, '1 epizoda'], [2, '2 epizode'], [4, '4 epizode'], [5, '5 epizoda'],
    [11, '11 epizoda'], [12, '12 epizoda'], [14, '14 epizoda'], [21, '21 epizoda'],
    [22, '22 epizode'], [101, '101 epizoda'], [111, '111 epizoda'], [178, '178 epizoda'],
  ])('%i in Serbian', (n, text) => {
    expect(episodeCount(n, 'sr')).toBe(text);
  });

  it('pluralises in English', () => {
    expect(episodeCount(1, 'en')).toBe('1 episode');
    expect(episodeCount(2, 'en')).toBe('2 episodes');
    expect(episodeCount(0, 'en')).toBe('0 episodes');
  });

  // The handoff's fixed "{n} epizoda" would print "22 epizoda"; agreement must win.
  it('does not use the fixed form for 2–4', () => {
    expect(episodeCount(22, 'sr')).not.toBe('22 epizoda');
  });
});

describe('agreeSr', () => {
  it('picks the teen form by the last two digits', () => {
    expect(agreeSr(113, ['a', 'b', 'c'])).toBe('c');
    expect(agreeSr(123, ['a', 'b', 'c'])).toBe('b');
  });
});

describe('episodeNoun', () => {
  // For "12 / 178 epizoda": the noun follows the number it stands next to — the total.
  it('agrees with the number it follows', () => {
    expect(episodeNoun(178, 'sr')).toBe('epizoda');
    expect(episodeNoun(22, 'sr')).toBe('epizode');
    expect(episodeNoun(1, 'sr')).toBe('epizoda');
    expect(episodeNoun(1, 'en')).toBe('episode');
    expect(episodeNoun(178, 'en')).toBe('episodes');
  });
});

describe('moreBelowLabel', () => {
  it('agrees in Serbian, including the 2–4 form the handoff leaves out', () => {
    expect(moreBelowLabel(1, 'sr')).toBe('Još 1 epizoda u ovom periodu — skroluj');
    expect(moreBelowLabel(3, 'sr')).toBe('Još 3 epizode u ovom periodu — skroluj');
    expect(moreBelowLabel(12, 'sr')).toBe('Još 12 epizoda u ovom periodu — skroluj');
  });

  it('pluralises in English', () => {
    expect(moreBelowLabel(1, 'en')).toBe('1 more episode in this period — scroll');
    expect(moreBelowLabel(5, 'en')).toBe('5 more episodes in this period — scroll');
  });
});
