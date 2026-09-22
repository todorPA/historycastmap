#!/usr/bin/env node
/**
 * Draws the shape of the archive in time, as an inline SVG in index.html.
 *
 * Replaces a screenshot of our own timeline UI with the thing the timeline is *about*.
 * The lesson is borrowed from Nadieh Bremer's "Searching for Birds", where every graphic is
 * made of its subject rather than of the interface: a snowy owl perched on its own search
 * curve, search volume drawn as eggs in a nest.
 *
 * Static, not computed in the browser: it is content, it changes only when the dataset
 * does, and it must render without JavaScript. Regenerate with `npm run chart` whenever
 * public/data/geo-events.json is replaced.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const data = JSON.parse(readFileSync(new URL('public/data/geo-events.json', ROOT), 'utf8'));

const FIRST = -1200;
const LAST = 2000;
const STEP = 100;

// Counts per century. Bucketing by start year: a reign spanning two centuries belongs to
// the one it began in, which is how the episodes themselves talk about it.
const buckets = new Map();
for (const e of data.events) {
  const c = Math.floor(e.year / STEP) * STEP;
  buckets.set(c, (buckets.get(c) ?? 0) + 1);
}

const centuries = [];
for (let c = FIRST; c <= LAST; c += STEP) centuries.push({ c, n: buckets.get(c) ?? 0 });

const total = data.events.length;
const peak = centuries.reduce((a, b) => (b.n > a.n ? b : a));
const share = Math.round((peak.n / total) * 100);

// ---- geometry -------------------------------------------------------------
const W = 1200;
const H = 360;
const PAD = { top: 56, right: 16, bottom: 34, left: 16 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;
const slot = plotW / centuries.length;
const barW = Math.max(6, slot - 4);
const maxN = peak.n;
const x = (i) => PAD.left + i * slot + (slot - barW) / 2;
const h = (n) => (n === 0 ? 0 : Math.max(2, (n / maxN) * plotH));
const y = (n) => PAD.top + plotH - h(n);

const label = (c) => (c < 0 ? `${-c}. p.n.e.` : String(c === 0 ? 1 : c));
const TICKS = [-1200, -800, -400, 0, 400, 800, 1200, 1600, 2000];

/**
 * The baseline carries the gap rather than leaving it to be inferred from absent bars.
 *
 * A dotted rule runs the whole span; solid segments sit under each unbroken run of centuries
 * that actually holds something. Twelve silent centuries then read as a fact the chart is
 * stating, not as a region where the drawing stops.
 */
const baseY = PAD.top + plotH;
const runs = [];
for (let i = 0; i < centuries.length; i++) {
  if (centuries[i].n === 0) continue;
  const start = i;
  while (i + 1 < centuries.length && centuries[i + 1].n > 0) i++;
  runs.push([start, i]);
}
const axis = runs
  .map(
    ([a, b]) =>
      `<line class="cc__axis" x1="${x(a).toFixed(1)}" y1="${baseY}" x2="${(x(b) + barW).toFixed(
        1,
      )}" y2="${baseY}" />`,
  )
  .join('\n        ');

const bars = centuries
  .map((d, i) =>
    d.n === 0
      ? ''
      : `<rect class="cc__bar${d.c === peak.c ? ' is-peak' : ''}" x="${x(i).toFixed(1)}" y="${y(
          d.n,
        ).toFixed(1)}" width="${barW.toFixed(1)}" height="${h(d.n).toFixed(
          1,
        )}" rx="1"><title>${label(d.c)}: ${d.n}</title></rect>`,
  )
  .filter(Boolean)
  .join('\n      ');

const ticks = TICKS.map((t) => {
  const i = centuries.findIndex((d) => d.c === t);
  if (i < 0) return '';
  const cx = x(i) + barW / 2;
  return `<text class="cc__tick" x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${label(
    t,
  )}</text>`;
})
  .filter(Boolean)
  .join('\n      ');

// Annotation sits on the peak, in the graphic rather than under it.
const peakIndex = centuries.findIndex((d) => d.c === peak.c);
const peakX = x(peakIndex) + barW / 2;
const peakY = y(peak.n);
const noteX = peakX - 24;

const svg = `<figure class="band band--chart">
      <svg class="cc" viewBox="0 0 ${W} ${H}" role="img"
           aria-label="Broj događaja po veku. Najviše ih je u dvadesetom veku: ${peak.n} od ${total}.">
        <line class="cc__gap" x1="${PAD.left}" y1="${baseY}" x2="${W - PAD.right}" y2="${baseY}" />
        ${axis}
      ${bars}
        <line class="cc__lead" x1="${peakX.toFixed(1)}" y1="${(peakY - 6).toFixed(
          1,
        )}" x2="${peakX.toFixed(1)}" y2="${PAD.top - 20}" />
        <text class="cc__note" x="${noteX.toFixed(1)}" y="${PAD.top - 26}" text-anchor="end">${
          peak.n
        } od ${total} događaja pada u dvadeseti vek.</text>
      ${ticks}
      </svg>
      <figcaption class="band__caption">
        Broj događaja po veku, od 1200. p.n.e. do 2006. Skoro ${share} odsto arhive staje u
        jedan vek, a dvanaest vekova nema nijedan zabeležen događaj.
      </figcaption>
    </figure>`;

// ---- splice into index.html ----------------------------------------------
const START = '<!-- century-chart:start -->';
const END = '<!-- century-chart:end -->';
const page = new URL('index.html', ROOT);
const html = readFileSync(page, 'utf8');
if (!html.includes(START) || !html.includes(END)) {
  console.error(`index.html is missing the ${START} / ${END} markers.`);
  process.exit(1);
}
const next =
  html.slice(0, html.indexOf(START) + START.length) +
  '\n    ' +
  svg +
  '\n    ' +
  html.slice(html.indexOf(END));
writeFileSync(page, next);

const empty = centuries.filter((d) => d.n === 0).length;
console.log(
  `century chart: ${centuries.length} centuries, ${empty} empty, peak ${peak.n} at ${label(
    peak.c,
  )} (${share}% of ${total})`,
);
