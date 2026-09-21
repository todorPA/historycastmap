#!/usr/bin/env node
/**
 * Fetches the self-hosted webfonts into public/fonts/.
 *
 * Not part of the build. The @font-face rules in src/styles/fonts.css fall through to the
 * system stack when these files are absent, so a fresh clone runs and looks correct without
 * this step; running it just upgrades the typography. Keeps the fonts out of git.
 *
 *   npm run fonts
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { argv, exit } from 'node:process';

const OUT = new URL('../public/fonts/', import.meta.url);
const CDN = 'https://cdn.jsdelivr.net/fontsource/fonts';

// Two subsets per face. latin-ext carries the Serbian diacritics (č ć š ž đ); cyrillic
// covers the handful of Cyrillic strings in the dataset. Split rather than merged so a
// reader who never hits a Cyrillic glyph never downloads that file.
const FILES = [
  ['ibm-plex-sans-400.woff2', `${CDN}/ibm-plex-sans@latest/latin-ext-400-normal.woff2`],
  ['ibm-plex-sans-600.woff2', `${CDN}/ibm-plex-sans@latest/latin-ext-600-normal.woff2`],
  ['ibm-plex-sans-cyrillic-400.woff2', `${CDN}/ibm-plex-sans@latest/cyrillic-400-normal.woff2`],
  ['ibm-plex-sans-cyrillic-600.woff2', `${CDN}/ibm-plex-sans@latest/cyrillic-600-normal.woff2`],
  ['ibm-plex-mono-400.woff2', `${CDN}/ibm-plex-mono@latest/latin-ext-400-normal.woff2`],
  ['ibm-plex-mono-600.woff2', `${CDN}/ibm-plex-mono@latest/latin-ext-600-normal.woff2`],
  ['ibm-plex-mono-cyrillic-400.woff2', `${CDN}/ibm-plex-mono@latest/cyrillic-400-normal.woff2`],
  ['literata.woff2', `${CDN}/literata:vf@latest/latin-ext-wght-normal.woff2`],
  ['literata-cyrillic.woff2', `${CDN}/literata:vf@latest/cyrillic-wght-normal.woff2`],
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
console.log('\nFonts in public/fonts/ (gitignored). Restart the dev server to pick them up.');
