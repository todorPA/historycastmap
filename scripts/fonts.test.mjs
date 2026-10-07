/**
 * Every @font-face in src/styles/fonts.css must point at a file that really draws the characters
 * its unicode-range claims, and every family must cover basic Latin, the Serbian letters and,
 * where it claims to, Cyrillic.
 *
 * The bug this exists for: the fonts were fetched as Fontsource `latin-ext` subsets only, which
 * hold č ć š ž đ but not a–z or 0–9, while fonts.css declared those same files for U+0000–00FF.
 * Browsers then drew ordinary letters in the system font and only the diacritics in IBM Plex —
 * two fonts in every Serbian word — and no build step, validator or type check could see it.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { codePointsOf } from './lib/woff2.mjs';

const root = new URL('../', import.meta.url);
const css = readFileSync(new URL('src/styles/fonts.css', root), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const BASE = '/historycastmap/';

const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const prop = (name) => new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(body)?.[1].trim();
  const url = /url\(['"]?([^'")]+)['"]?\)/.exec(prop('src') ?? '')?.[1];
  const ranges = (prop('unicode-range') ?? '')
    .split(',')
    .map((r) => r.trim().replace(/^U\+/i, ''))
    .filter(Boolean)
    .map((r) => {
      const [a, b] = r.split('-');
      return [parseInt(a, 16), parseInt(b ?? a, 16)];
    });
  return {
    family: prop('font-family')?.replace(/['"]/g, ''),
    style: prop('font-style') ?? 'normal',
    weight: prop('font-weight'),
    url,
    path: url ? new URL(`public/${url.slice(BASE.length)}`, root) : null,
    ranges,
  };
});

const covers = (ranges, cp) => ranges.some(([a, b]) => cp >= a && cp <= b);
const cps = (s) => [...s].map((c) => c.codePointAt(0));

const SAMPLES = [
  { name: 'basic Latin', probe: 0x61, chars: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' },
  { name: 'Serbian Latin', probe: 0x10d, chars: 'čćšžđČĆŠŽĐ' },
  { name: 'Cyrillic', probe: 0x436, chars: 'жЖшШђЂ' },
];

describe('fonts.css', () => {
  it('declares some faces', () => {
    expect(faces.length).toBeGreaterThan(0);
  });

  it.each(faces.map((f) => [`${f.family} ${f.style} ${f.weight} → ${f.url}`, f]))('%s exists', (_label, f) => {
    expect(f.path && existsSync(f.path)).toBe(true);
  });

  for (const sample of SAMPLES) {
    const claiming = faces.filter((f) => covers(f.ranges, sample.probe));
    it.each(claiming.map((f) => [f.url, f]))(`%s draws the ${sample.name} its range claims`, (_url, f) => {
      const drawn = codePointsOf(f.path);
      const missing = [...sample.chars].filter((c) => !drawn.has(c.codePointAt(0)));
      expect(missing.join('')).toBe('');
    });
  }

  // Each family, per style and weight, must have SOME face covering basic Latin and the Serbian
  // letters. Without this, deleting the latin face entirely would pass the per-file checks above.
  const variants = [...new Set(faces.map((f) => `${f.family}|${f.style}|${f.weight}`))];
  it.each(variants)('%s covers basic Latin and the Serbian letters', (variant) => {
    const own = faces.filter((f) => `${f.family}|${f.style}|${f.weight}` === variant);
    for (const cp of cps('az09čćšžđ')) expect(own.some((f) => covers(f.ranges, cp)), String.fromCodePoint(cp)).toBe(true);
  });

  it('references every font file that is committed, and no stale ones', () => {
    const referenced = new Set(faces.map((f) => f.url.split('/').pop()));
    const onDisk = readdirSync(new URL('public/fonts/', root)).filter((f) => f.endsWith('.woff2'));
    expect(onDisk.filter((f) => !referenced.has(f))).toEqual([]);
  });
});
