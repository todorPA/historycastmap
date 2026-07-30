#!/usr/bin/env node
// Zero-dependency check that a dataset satisfies geo-events.schema.json's constraints.
// Usage: node scripts/validate-data.mjs [file] [--strict]
//
// --strict turns two things into errors instead of warnings: an off-list `region`, and one
// place split across several ids. Use it for the dataset being generated (geo-events.json).
// The sample set predates both rules and is produced upstream, so by default they are
// warnings and CI stays green.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const strict = args.includes('--strict') || args.includes('--strict-regions');
const file = args.find((a) => !a.startsWith('--')) ?? 'public/data/geo-events.sample.json';
const data = JSON.parse(readFileSync(file, 'utf8'));
const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const PLACE_KINDS = ['city', 'region', 'country', 'battle-site', 'landmark', 'water', 'person-seat', 'unknown'];
const EVENT_TYPES = ['battle', 'siege', 'conquest', 'coronation', 'treaty', 'founding', 'death', 'birth', 'reign', 'uprising', 'reform', 'other'];
const CONFIDENCE = ['high', 'medium', 'low'];
const TIMESTAMP = /^\d{1,3}:\d{2}$/;

// `region` is a closed set, and this is enforced rather than requested: regions are the
// timeline's group rows, so the count is a hard UI constraint, not a matter of taste. Left
// to per-episode judgement the list grows about one value every two episodes — 6 regions at
// 5 episodes, 14 at 15, 15 at 25 — which extrapolates to 60+ unreadable rows at 181.
// Adding a value here is fine; doing it by accident is not.
const REGIONS = [
  'Balkan',
  'Vizantija i Egejski svet',
  'Osmansko carstvo',
  'Srednja Evropa',
  'Zapadna Evropa',
  'Istočna Evropa',
  'Severna Evropa i Atlantik',
  'Bliski istok',
  'Afrika',
  'Azija',
  'Severna Amerika',
  'Južna Amerika',
];

for (const key of ['meta', 'places', 'episodes', 'events']) {
  if (!(key in data)) err(`missing top-level "${key}"`);
}
for (const key of ['source', 'generated', 'count']) {
  if (data.meta?.[key] === undefined) err(`meta.${key} is required`);
}
if (data.meta?.count !== data.events?.length) {
  err(`meta.count (${data.meta?.count}) != events.length (${data.events?.length})`);
}

const placeIds = new Set();
for (const [i, p] of (data.places ?? []).entries()) {
  const at = `places[${i}]${p.id ? ` (${p.id})` : ''}`;
  if (!p.id) err(`${at}: id is required`);
  else if (placeIds.has(p.id)) err(`${at}: duplicate id`);
  else placeIds.add(p.id);
  // The schema only *describes* ids as kebab-case (no `pattern`), so this is advisory:
  // a non-ASCII id still resolves as long as events reference the same string.
  if (!/^[a-z0-9-]+$/.test(p.id ?? '')) warn(`${at}: id is not kebab-case ASCII`);
  if (!p.name?.sr) err(`${at}: name.sr is required`);
  if (!p.name?.en) err(`${at}: name.en is required by the schema`);
  if (typeof p.lat !== 'number' || p.lat < -90 || p.lat > 90) err(`${at}: lat out of range`);
  if (typeof p.lng !== 'number' || p.lng < -180 || p.lng > 180) err(`${at}: lng out of range`);
  if (p.kind && !PLACE_KINDS.includes(p.kind)) err(`${at}: unknown kind "${p.kind}"`);
}

const episodeIds = new Set();
for (const [i, e] of (data.episodes ?? []).entries()) {
  const at = `episodes[${i}]${e.id ? ` (${e.id})` : ''}`;
  if (!e.id) err(`${at}: id is required`);
  else if (episodeIds.has(e.id)) err(`${at}: duplicate id`);
  else episodeIds.add(e.id);
  if (!e.title?.sr) err(`${at}: title.sr is required`);
  if (!e.audioUrl) err(`${at}: audioUrl is required`);
}

const eventIds = new Set();
const offListRegions = new Map();
for (const [i, ev] of (data.events ?? []).entries()) {
  const at = `events[${i}]${ev.id ? ` (${ev.id})` : ''}`;
  if (!ev.id) err(`${at}: id is required`);
  else if (eventIds.has(ev.id)) err(`${at}: duplicate id`);
  else eventIds.add(ev.id);
  if (!ev.title?.sr) err(`${at}: title.sr is required`);
  if (!ev.description?.sr) err(`${at}: description.sr is required`);
  if (!Number.isInteger(ev.year)) err(`${at}: year must be an integer (BC negative)`);
  if (ev.yearEnd != null) {
    if (!Number.isInteger(ev.yearEnd)) err(`${at}: yearEnd must be an integer or null`);
    else if (ev.yearEnd < ev.year) err(`${at}: yearEnd (${ev.yearEnd}) < year (${ev.year})`);
  }
  if (!placeIds.has(ev.placeId)) err(`${at}: placeId "${ev.placeId}" not found in places`);
  if (!episodeIds.has(ev.episodeId)) err(`${at}: episodeId "${ev.episodeId}" not found in episodes`);
  if (ev.timestamp && !TIMESTAMP.test(ev.timestamp)) err(`${at}: timestamp "${ev.timestamp}" is not MM:SS`);
  if (ev.type && !EVENT_TYPES.includes(ev.type)) err(`${at}: unknown type "${ev.type}"`);
  if (ev.region && !REGIONS.includes(ev.region)) {
    offListRegions.set(ev.region, (offListRegions.get(ev.region) ?? 0) + 1);
  }
  if (ev.type === 'reign' && ev.yearEnd == null) warn(`${at}: type "reign" without yearEnd — a reign is almost always a period, worth checking`);
  if (!CONFIDENCE.includes(ev.confidence)) err(`${at}: confidence must be high|medium|low`);
}

const unusedPlaces = [...placeIds].filter((id) => !data.events.some((e) => e.placeId === id));
if (unusedPlaces.length) warn(`places with no events: ${unusedPlaces.join(', ')}`);

// Same coordinates under two ids means one real place got split — usually because the id was
// named after the episode's topic ("beograd-vuk") instead of the place ("beograd"), so the
// alias-based merge had nothing to match on. Place identity is meant to be canonical across
// all episodes (PLAN.md §7.4): split places scatter one city into several markers and break
// the "map of that story" view.
const byCoord = new Map();
for (const p of data.places ?? []) {
  if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
  const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
  byCoord.set(key, [...(byCoord.get(key) ?? []), p.id]);
}
for (const [coord, ids] of byCoord) {
  if (ids.length > 1) (strict ? err : warn)(`same coordinates (${coord}) under ${ids.length} place ids: ${ids.join(', ')} — merge them`);
}

// One line per off-list value, not per event — the point is which values to map, not how often.
if (offListRegions.size) {
  const listed = [...offListRegions.entries()].map(([r, n]) => `"${r}" (${n})`).join(', ');
  const report = strict ? err : warn;
  report(
    `${offListRegions.size} region(s) outside the closed set: ${listed}\n      allowed: ${REGIONS.join(' | ')}`,
  );
}

const usedRegions = new Set(data.events.map((e) => e.region).filter(Boolean));
console.log(
  `${file}: ${data.places.length} places, ${data.episodes.length} episodes, ${data.events.length} events, ${usedRegions.size} regions`,
);

if (warnings.length) {
  console.log(`\n! ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\n✓ valid against geo-events.schema.json constraints');
