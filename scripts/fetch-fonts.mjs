#!/usr/bin/env node
/**
 * Fetches the self-hosted webfonts into public/fonts/, where they are committed.
 *
 * Run it only to add or update a face; the build uses the committed files and never downloads.
 * They used to be gitignored and fetched by hand, which is how the GitHub Actions deploy ended up
 * serving none of them.
 *
 *   npm run fonts            fetch what is missing
 *   npm run fonts -- --force refetch everything
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { argv, exit } from 'node:process';

const OUT = new URL('../public/fonts/', import.meta.url);
const CDN = 'https://cdn.jsdelivr.net/fontsource/fonts';

/**
 * Every face needs its `latin` subset as well as `latin-ext`. Fontsource's latin-ext holds the
 * extended letters (č ć š ž đ) but NOT a–z or 0–9, and for a long time this script fetched only
 * that one — so ordinary letters always fell back to the system font and only the diacritics
 * rendered in the webfont. scripts/fonts.test.mjs now checks each file holds what fonts.css
 * claims it holds.
 *
 * Split by subset so a reader who never meets a Cyrillic or Vietnamese glyph never downloads it;
 * the unicode-range values in fonts.css make that choice, and must match these subsets.
 */
const STATIC = [
  ['ibm-plex-sans', [400, 600], ['latin', 'latin-ext', 'cyrillic']],
  ['ibm-plex-mono', [400, 600], ['latin', 'latin-ext']],
  ['ibm-plex-mono', [400], ['cyrillic']],
];
// Variable fonts: one file per subset and style carries every weight.
const VARIABLE = [
  ['literata', ['normal'], ['latin', 'latin-ext', 'cyrillic']],
  // Newsreader has no Cyrillic; Serbian content here is Latin script.
  ['newsreader', ['normal', 'italic'], ['latin', 'latin-ext']],
];

const FILES = [
  ...STATIC.flatMap(([face, weights, subsets]) =>
    weights.flatMap((w) =>
      subsets.map((sub) => [`${face}-${sub}-${w}.woff2`, `${CDN}/${face}@latest/${sub}-${w}-normal.woff2`]),
    ),
  ),
  ...VARIABLE.flatMap(([face, styles, subsets]) =>
    styles.flatMap((style) =>
      subsets.map((sub) => [
        `${face}-${sub}${style === 'italic' ? '-italic' : ''}.woff2`,
        `${CDN}/${face}:vf@latest/${sub}-wght-${style}.woff2`,
      ]),
    ),
  ),
];

const force = argv.includes('--force');
await mkdir(OUT, { recursive: true });

let failed = 0;
for (const [name, url] of FILES) {
  const dest = new URL(name, OUT);

  if (!force) {
    try {
      await access(dest);
      console.log(`skip  ${name} (already present, --force to refetch)`);
      continue;
    } catch {
      // not there yet, fetch it
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`ok    ${name}`);
  } catch (err) {
    failed++;
    console.error(`fail  ${name}: ${err.message}`);
  }
}

if (failed) {
  console.error(
    `\n${failed} file(s) failed. The app still runs on the system font fallback;\n` +
      'rerun when the network allows, or drop the woff2 files into public/fonts/ by hand.',
  );
  exit(1);
}
console.log('\nFonts written to public/fonts/. Commit them; restart the dev server to pick them up.');
