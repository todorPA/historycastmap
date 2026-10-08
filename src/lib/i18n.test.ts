import { describe, expect, it } from 'vitest';
import { dictionaries, tf } from './i18n';

describe('i18n', () => {
  // Only `sr` defines the key type, so a key added to one language alone still compiles —
  // and then shows up in the UI as the raw key. This is the check.
  it('has the same keys in both languages', () => {
    expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries.sr).sort());
  });

  it('has no empty strings', () => {
    for (const lang of ['sr', 'en'] as const) {
      for (const [k, v] of Object.entries(dictionaries[lang])) expect(v, `${lang}.${k}`).not.toBe('');
    }
  });
});

describe('tf', () => {
  // Word order differs by language, so the number goes where each string puts it.
  it('fills {placeholders} where each language puts them', () => {
    expect(tf('sr', 'andMore', { n: 4 })).toBe('i još 4');
    expect(tf('en', 'andMore', { n: 4 })).toBe('and 4 more');
  });
  it('leaves a string without placeholders as it is', () => {
    expect(tf('sr', 'close', { n: 1 })).toBe('Zatvori');
  });
});
