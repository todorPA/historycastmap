#!/usr/bin/env node
/**
 * Fetches the podcast feed and writes the episode list that the merge step reads.
 *
 * Usage: node scripts/fetch-episodes.mjs [outfile] [--feed <url>]
 *
 * This is step 0 of the pipeline in docs/EXTRACTION-PROMPT.md, which until now happened
 * outside the repo — merge-fragments.mjs reads its episode metadata from whatever file
 * HISTORYCAST_EPISODES_JSON points at, and that file was produced by hand. This script
 * produces it reproducibly.
 *
 *   feed ──▶ episodes.json ──▶ merge-fragments.mjs ──▶ geo-events.json
 *
 * The output shape is fixed by its only consumer (merge-fragments.mjs:123-142): an array of
 * { title, pubDate, audio_url }. Nothing else is read, so nothing else is written.
 *
 * `title` keeps its leading episode number. That number is the join key — merge-fragments
 * parses it out to match a fragment to its episode, and strips it from the displayed title.
 * Removing it here would break the join silently.
 *
 * ---
 *
 * No XML dependency, by the same rule as the rest of scripts/: this reads three fields out
 * of <item> blocks, which does not justify a parser. The risk that buys is silent
 * mis-parsing, which is the error class merge-fragments.mjs already warns about — invisible
 * to the validator, visible only as a wrong marker or a dead audio link. So every item is
 * checked for all three fields and anything incomplete is named on stderr rather than
 * quietly dropped, and the summary states how many titles carry the number the join needs.
 *
 * If the feed ever moves off plain RSS 2.0 enclosures, replace this with a real parser
 * rather than widening the patterns.
 */
import { writeFileSync } from 'node:fs';

const DEFAULT_FEED = 'https://media.rss.com/rs-historycast/feed.xml';
const DEFAULT_OUT = 'episodes.json';

const args = process.argv.slice(2);
const feedFlag = args.indexOf('--feed');
const feedUrl = feedFlag >= 0 ? args[feedFlag + 1] : (process.env.HISTORYCAST_FEED_URL ?? DEFAULT_FEED);
const out = args.filter((a, i) => !a.startsWith('--') && i !== feedFlag + 1)[0] ?? DEFAULT_OUT;

if (!feedUrl) {
  console.error('--feed needs a URL.');
  process.exit(1);
}

// ---- XML text ------------------------------------------------------------
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' };

/** CDATA out, entities in, whitespace collapsed. Feed titles carry stray newlines. */
function text(raw) {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+|#39);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** First occurrence of a child tag, searched inside one <item> block only. */
function tag(item, name) {
  const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(item);
  return m ? text(m[1]) : '';
}

// ---- fetch ---------------------------------------------------------------
const res = await fetch(feedUrl, {
  headers: { accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8' },
  redirect: 'follow',
});
if (!res.ok) {
  console.error(`${feedUrl} returned ${res.status} ${res.statusText}.`);
  process.exit(1);
}
const xml = await res.text();

const blocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
if (blocks.length === 0) {
  console.error(`No <item> elements in ${feedUrl}. The feed moved, or it is not RSS.`);
  process.exit(1);
}

// ---- items ---------------------------------------------------------------
const episodes = [];
const dropped = [];

for (const block of blocks) {
  const title = tag(block, 'title');
  const pubDate = tag(block, 'pubDate');
  // The audio lives on <enclosure url="...">; itunes: tags never carry it.
  const enclosure = /<enclosure\b[^>]*\burl\s*=\s*["']([^"']+)["']/i.exec(block);
  const audio_url = enclosure ? text(enclosure[1]) : '';

  const missing = [
    !title && 'title',
    !pubDate && 'pubDate',
    !audio_url && 'enclosure url',
  ].filter(Boolean);

  if (missing.length > 0) {
    dropped.push(`${title || '(untitled item)'} — no ${missing.join(', ')}`);
    continue;
  }

  episodes.push({ title, pubDate, audio_url });
}

if (episodes.length === 0) {
  console.error(`All ${blocks.length} items were incomplete. Nothing written.`);
  for (const d of dropped) console.error(`  ${d}`);
  process.exit(1);
}

// ---- checks the merge step depends on ------------------------------------
// merge-fragments.mjs joins a fragment to its episode on the number leading the title, so
// an episode without one can only be matched by slug. Worth knowing before the merge, not
// after: this is the same rule as TITLE_NUMBER there, and the two must not drift.
const numbered = episodes.filter((e) => /^\s*(\d+)\.?\s*[-–—=]*\s*/.test(e.title)).length;

const seen = new Set();
const duplicates = episodes
  .map((e) => e.title)
  .filter((t) => (seen.has(t) ? true : (seen.add(t), false)));

writeFileSync(out, `${JSON.stringify(episodes, null, 2)}\n`);

console.log(`${episodes.length} episodes -> ${out}`);
console.log(`  ${numbered} titles lead with an episode number; ${episodes.length - numbered} match by slug`);
if (duplicates.length > 0) {
  console.warn(`  ${duplicates.length} duplicate titles, which will collide on merge:`);
  for (const d of new Set(duplicates)) console.warn(`    ${d}`);
}
if (dropped.length > 0) {
  console.warn(`  ${dropped.length} items skipped:`);
  for (const d of dropped) console.warn(`    ${d}`);
}
console.log(`\nNext: HISTORYCAST_EPISODES_JSON=${out} node scripts/merge-fragments.mjs`);
