/**
 * Writes public/data/basemap/ne-50m.json from the design prototype's embedded Natural Earth
 * geometry (window.HC_GEO in docs/design/revamp/prototype.html), so the basemap needs no
 * download and matches the approved design exactly.
 *
 * The format is the prototype's own, kept as-is: { land, lakes, rivers, borders }, each a list of
 * flat [lon×100, lat×100, …] integer arrays. Land, lakes and borders are rings; rivers are lines.
 * Natural Earth is public domain; credit it anyway (config/basemaps.ts).
 *
 *   node scripts/extract-basemap.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('docs/design/revamp/prototype.html', root), 'utf8');

/** The object literal after `HC_GEO=`, found by bracket matching (it holds no strings). */
function extract(source) {
  const start = source.indexOf('HC_GEO=');
  if (start < 0) throw new Error('HC_GEO not found in prototype.html');
  const from = start + 'HC_GEO='.length;
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return JSON.parse(source.slice(from, i + 1));
    }
  }
  throw new Error('HC_GEO is not closed');
}

const geo = extract(html);
const LAYERS = ['land', 'lakes', 'rivers', 'borders'];
for (const k of LAYERS) {
  if (!Array.isArray(geo[k]) || !geo[k].every((r) => Array.isArray(r) && r.length % 2 === 0 && r.every(Number.isInteger))) {
    throw new Error(`HC_GEO.${k} is not a list of flat integer coordinate arrays`);
  }
}

const out = new URL('public/data/basemap/', root);
mkdirSync(out, { recursive: true });
const json = JSON.stringify(Object.fromEntries(LAYERS.map((k) => [k, geo[k]])));
writeFileSync(new URL('ne-50m.json', out), json + '\n');
console.log(`ne-50m.json: ${(json.length / 1024).toFixed(0)} KB`, LAYERS.map((k) => `${k} ${geo[k].length}`).join(', '));
