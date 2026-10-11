import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import shipped from '../../public/data/geo-events.json';
import { archiveStats } from './archiveStats';
import { chartText, landingStrings } from './strings';
import page from '../../index.html?raw';

const strings = landingStrings(archiveStats(shipped as unknown as GeoData));

describe('landingStrings', () => {
  it('has every key in both languages, none empty', () => {
    expect(Object.keys(strings.en).sort()).toEqual(Object.keys(strings.sr).sort());
    for (const lang of ['sr', 'en'] as const) for (const [k, v] of Object.entries(strings[lang])) expect(v, `${lang}.${k}`).not.toBe('');
  });

  it('states the data, with nouns that agree with the numbers', () => {
    expect(strings.sr.c_p).toBe('178 epizoda, 742 poglavlja i 279 mesta, raspoređenih kroz dve i po hiljade godina.');
    expect(strings.en.c_p).toBe('178 episodes, 742 chapters and 279 places, spread across two and a half thousand years.');
    expect([strings.sr.s1n, strings.sr.s1l, strings.sr.s3l]).toEqual(['742', 'događaja', 'mesta na mapi']);
  });

  it('carries the decisions of 2026-10-11: sourced names, no weekly promise', () => {
    expect(strings.sr.p_note).toContain('Umetničkog faktora');
    expect(strings.sr.g_p).not.toMatch(/nedelj/);
    expect(strings.en.g_p).not.toMatch(/week/);
  });
});

describe('index.html', () => {
  // The build fails on a key with no Serbian string; English would fail silently, keeping Serbian.
  it('has a string in both languages for every key it uses', () => {
    const keys = new Set([...page.matchAll(/data-(?:i|alt|aria)="(\w+)"/g), ...page.matchAll(/%%(\w+)%%/g)].map((m) => m[1]));
    expect(keys.size).toBeGreaterThan(90);
    for (const k of keys) {
      expect(strings.sr, `sr.${k}`).toHaveProperty(k);
      expect(strings.en, `en.${k}`).toHaveProperty(k);
    }
  });

  // Every accessible name and image description goes through the string table, so switching to
  // English leaves no Serbian label behind. Allowed literals: bilingual or a proper name.
  it('has no untranslated accessible name or alt text', () => {
    const literal = [...page.matchAll(/\s(?:aria-label|alt|title)="([^"%]+)"/g)].map((m) => m[1]);
    expect(literal.filter((v) => !['Jezik / Language', 'HistoryCast'].includes(v))).toEqual([]);
  });

  it('types no archive number by hand', () => {
    expect(page).not.toMatch(/>\s*(178|742|279|285)\s*</);
  });
});

describe('chartText', () => {
  it('agrees in Serbian where the design did not ("5 veka" → "5 vekova")', () => {
    expect(chartText.sr.emptyChapters(5)).toBe('5 vekova bez poglavlja');
    expect(chartText.sr.emptyChapters(3)).toBe('3 veka bez poglavlja');
  });

  it('names centuries both ways', () => {
    expect(chartText.sr.century(-600)).toBe('6. vek p.n.e.');
    expect(chartText.sr.centuryFrom(-600)).toBe('6. veka p.n.e.');
    expect(chartText.en.century(1800)).toBe('19th century');
    expect(chartText.en.century(-100)).toBe('1st century BC');
    expect(chartText.en.century(1000)).toBe('11th century');
  });
});
