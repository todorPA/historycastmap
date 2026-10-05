import { describe, expect, it } from 'vitest';
import { fold, findFolded } from './fold';

describe('fold', () => {
  it('lowercases and strips the combining diacritics', () => {
    expect(fold('Čačak, Šabac, Žiča')).toBe('cacak, sabac, zica');
  });

  // The old sidebar folded đ to "d", so typing "Karadjordje" never found "Karađorđe".
  it('spells đ as dj, like the slug rule', () => {
    expect(fold('Karađorđe')).toBe('karadjordje');
    expect(fold('Đurađ')).toBe('djuradj');
  });
});

describe('findFolded', () => {
  it('returns the match position in the ORIGINAL string', () => {
    expect(findFolded('Bitka na Kosovu', 'kosov')).toEqual([9, 14]);
  });

  it('maps across a đ, which folds to two characters', () => {
    // "dj" in the query covers the single "đ" at index 4.
    const text = 'Karađorđe posle Karađorđa';
    const [s, e] = findFolded(text, 'djordje')!;
    expect(text.slice(s, e)).toBe('đorđe');
  });

  it('matches regardless of diacritics on either side', () => {
    const text = 'Stefan Dušan';
    const [s, e] = findFolded(text, 'dusan')!;
    expect(text.slice(s, e)).toBe('Dušan');
  });

  it('returns null when there is no match, or for an empty query', () => {
    expect(findFolded('Neron', 'cezar')).toBeNull();
    expect(findFolded('Neron', '')).toBeNull();
  });
});
