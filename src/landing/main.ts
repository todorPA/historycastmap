/**
 * Landing page script (docs/plans/2026-10-11-landing.md). The page is complete in Serbian
 * without it — the build fills every string (vite.config.ts). This adds what needs a browser:
 * the language switch, the two charts, the phone menu and the current-section highlight.
 */
import stats from 'virtual:landing-stats';
import { ERAS, type EraId } from '../config/eras';
import type { Lang } from '../types/events';
import type { CenturyRow } from './archiveStats';
import { FIRST_CENTURY } from './archiveStats';
import { chartText, landingStrings, type LandingKey } from './strings';

const STRINGS = landingStrings(stats);
/** Shared with the explorer, so a reader's language carries across both pages. */
const LANG_KEY = 'hcm-lang';
const BASE = import.meta.env.BASE_URL;

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];
const ERA_ORDER = ERAS.map((e) => e.id);
const eraName = (id: EraId, lang: Lang) => ERAS.find((e) => e.id === id)!.name[lang] ?? '';
const eraColour = (id: EraId) => ERAS.find((e) => e.id === id)!.color;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

let lang: Lang = 'sr';
let unit: 'ep' | 'ch' = 'ep';

function initialLang(): Lang {
  const hash = location.hash.slice(1).toLowerCase();
  if (hash === 'en' || hash === 'sr') return hash;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'sr') return saved;
  } catch {
    // Storage blocked: Serbian, the default.
  }
  return 'sr';
}

function setLang(next: Lang) {
  lang = next;
  const t = STRINGS[lang];
  document.documentElement.lang = lang === 'en' ? 'en' : 'sr-Latn';
  document.title = t.meta_title;
  for (const el of $$('[data-i]')) {
    const text = t[el.dataset.i as LandingKey];
    if (text !== undefined) el.innerHTML = text;
  }
  for (const img of $$<HTMLImageElement>('img[data-img]')) img.src = `${BASE}img/landing/${img.dataset.img}-${lang}.webp`;
  for (const img of $$<HTMLImageElement>('img[data-alt]')) img.alt = t[img.dataset.alt as LandingKey] ?? img.alt;
  for (const a of $$<HTMLAnchorElement>('.js-map')) a.href = `${BASE}app.html?lang=${lang}`;
  for (const b of $$('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  $('#nav')?.setAttribute('aria-label', lang === 'en' ? 'Contents' : 'Sadržaj');
  $('#menu')?.setAttribute('aria-label', lang === 'en' ? 'Menu' : 'Meni');
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Not remembered; the switch still works for this visit.
  }
  renderChart();
  renderGrowth();
}

/* ---------- the archive across the centuries: bars stacked by era ---------- */
function renderChart() {
  const host = $('#chart');
  if (!host) return;
  const rows: CenturyRow[] = unit === 'ep' ? stats.episodesByCentury : stats.chaptersByCentury;
  const ct = chartText[lang];
  const cs = rows.map((r) => ({ ...r, n: Object.values(r.byEra).reduce((a, b) => a + (b ?? 0), 0) }));
  const total = cs.reduce((a, b) => a + b.n, 0);
  const peak = cs.reduce((a, b) => (b.n > a.n ? b : a));
  const W = 1000;
  const H = 330;
  const P = { t: 58, r: 14, b: 34, l: 14 };
  const pw = W - P.l - P.r;
  const ph = H - P.t - P.b;
  const slot = pw / cs.length;
  const bw = Math.max(6, slot - 6);
  const x = (i: number) => P.l + i * slot + (slot - bw) / 2;
  const base = P.t + ph;
  const k = ph / Math.max(1, peak.n);

  let grid = '';
  const stepV = unit === 'ep' ? 20 : 100;
  for (let v = stepV; v <= peak.n; v += stepV) {
    grid += `<line class="grid" x1="${P.l}" x2="${W - P.r}" y1="${base - v * k}" y2="${base - v * k}"/><text x="${W - P.r}" y="${base - v * k - 5}" text-anchor="end">${v}</text>`;
  }

  // A solid baseline under each unbroken run of centuries that hold something; dotted between.
  let runs = '';
  let start = -1;
  cs.forEach((d, i) => {
    if (d.n && start < 0) start = i;
    if ((!d.n || i === cs.length - 1) && start >= 0) {
      const end = d.n ? i : i - 1;
      runs += `<line class="base" x1="${x(start)}" x2="${x(end) + bw}" y1="${base}" y2="${base}"/>`;
      start = -1;
    }
  });

  const firstFilled = cs.findIndex((d) => d.n);
  const empty = cs.slice(firstFilled).filter((d) => !d.n).length;

  let bars = '';
  cs.forEach((d, i) => {
    const eras = ERA_ORDER.filter((e) => d.byEra[e]);
    let y = base;
    let seg = '';
    eras.forEach((e, j) => {
      const h = Math.max(2, (d.byEra[e] ?? 0) * k);
      y -= h;
      const gap = j < eras.length - 1 ? 2 : 0;
      seg += `<rect x="${x(i)}" y="${y}" width="${bw}" height="${h - gap}" rx="${j === eras.length - 1 ? 3 : 0}" fill="${eraColour(e)}"/>`;
    });
    const label =
      `${ct.century(d.century)} · ${ct.count(d.n, unit)}` +
      (eras.length > 1 ? ' · ' + eras.map((e) => `${eraName(e, lang)} ${d.byEra[e]}`).join(', ') : '');
    bars += `<g class="bar" data-tip="${esc(label)}"><rect class="hit" x="${P.l + i * slot}" y="${P.t - 20}" width="${slot}" height="${ph + 20 + P.b}"/>${seg}</g>`;
  });

  const ticks = [-1200, -800, -400, 0, 400, 800, 1200, 1600, 2000]
    .map((c) => `<text x="${x((c - FIRST_CENTURY) / 100) + bw / 2}" y="${H - 10}" text-anchor="middle">${ct.tick(c)}</text>`)
    .join('');
  const pi = cs.indexOf(peak);
  const px = x(pi) + bw / 2;
  const py = base - peak.n * k;
  const share = Math.round((peak.n / Math.max(1, total)) * 100);
  const note =
    `<text class="peak" x="${px - 8}" y="${py - 24}" text-anchor="end">${esc(ct.peak(share, peak.n, total, ct.century(peak.century)))}</text>` +
    `<line x1="${px - 4}" y1="${py - 20}" x2="${px}" y2="${py - 6}" stroke="#645241" stroke-width="1"/>` +
    `<text class="note" x="${P.l}" y="18">${esc(unit === 'ep' ? ct.emptyEpisodes(empty, ct.centuryFrom(cs[firstFilled].century)) : ct.emptyChapters(empty))}</text>`;

  host.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(STRINGS[lang].d_h)}"><line class="dots" x1="${P.l}" x2="${W - P.r}" y1="${base}" y2="${base}"/>${grid}${runs}${bars}${ticks}${note}</svg>` +
    '<div class="tip" id="tip" hidden></div>';
  const legend = $('#legend');
  if (legend) legend.innerHTML = ERAS.map((e) => `<span><i style="background:${e.color}"></i>${esc(eraName(e.id, lang))}</span>`).join('');

  const tip = $('#tip')!;
  for (const g of $$<SVGGElement>('#chart g.bar')) {
    g.addEventListener('pointerenter', () => {
      tip.hidden = false;
      tip.textContent = g.dataset.tip ?? '';
    });
    g.addEventListener('pointermove', (ev) => {
      const r = host.getBoundingClientRect();
      tip.style.left = `${ev.clientX - r.left + host.scrollLeft}px`;
      tip.style.top = `${ev.clientY - r.top}px`;
    });
    g.addEventListener('pointerleave', () => {
      tip.hidden = true;
    });
  }
}

for (const b of $$('[data-unit]')) {
  b.addEventListener('click', () => {
    unit = b.dataset.unit === 'ch' ? 'ch' : 'ep';
    for (const other of $$('[data-unit]')) other.setAttribute('aria-pressed', String(other === b));
    renderChart();
  });
}

/* ---------- the archive's growth, by quarter of publication ---------- */
function renderGrowth() {
  const host = $('#spark');
  if (!host || stats.growth.length < 2) return;
  const t = STRINGS[lang];
  const W = 620;
  const H = 200;
  const P = { t: 22, r: 96, b: 30, l: 8 };
  const pts = stats.growth;
  const max = Math.ceil(stats.episodes / 20) * 20;
  const pw = W - P.l - P.r;
  const ph = H - P.t - P.b;
  const X = (i: number) => P.l + (i * pw) / (pts.length - 1);
  const Y = (v: number) => P.t + ph - (v / max) * ph;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.total).toFixed(1)}`).join(' ');
  const area = `${line} L${X(pts.length - 1)} ${Y(0)} L${X(0)} ${Y(0)} Z`;
  // A year label where each year begins (its first quarter in the data).
  const ticks = pts
    .map((p, i) =>
      i === 0 || p.quarter === 1
        ? `<text x="${X(i)}" y="${H - 8}" text-anchor="start">${p.year}</text><line x1="${X(i)}" x2="${X(i)}" y1="${Y(0)}" y2="${Y(0) + 5}" stroke="#95826A"/>`
        : '',
    )
    .join('');
  const last = pts.length - 1;
  host.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.growCap)}">` +
    `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="#95826A"/>` +
    `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(100)}" y2="${Y(100)}" stroke="#DCCFBA"/><text x="${P.l}" y="${Y(100) - 5}">100</text>` +
    `<path d="${area}" fill="rgba(212,170,85,.22)"/><path d="${line}" fill="none" stroke="#8A6620" stroke-width="2" stroke-linejoin="round"/>` +
    `<circle cx="${X(last)}" cy="${Y(pts[last].total)}" r="5" fill="#D4AA55" stroke="#21170F" stroke-width="1.5"/>` +
    `<text class="end" x="${X(last) + 10}" y="${Y(pts[last].total) + 4}">${esc(t.growEnd)}</text>${ticks}</svg>` +
    `<figcaption class="muted" style="margin-top:6px;font-size:12.5px">${esc(t.growCap)}</figcaption>`;
}

/* ---------- header: the phone menu, and which section you are in ---------- */
const menu = $('#menu');
const nav = $('#nav');
menu?.addEventListener('click', () => {
  const open = !nav?.classList.contains('is-open');
  nav?.classList.toggle('is-open', open);
  menu.setAttribute('aria-expanded', String(open));
});
nav?.addEventListener('click', (e) => {
  if ((e.target as Element).closest('a')) {
    nav.classList.remove('is-open');
    menu?.setAttribute('aria-expanded', 'false');
  }
});
if ('IntersectionObserver' in window) {
  const links = $$<HTMLAnchorElement>('#nav a');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) for (const a of links) a.classList.toggle('is-here', a.getAttribute('href') === `#${e.target.id}`);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const s of $$('main section[id]')) io.observe(s);
}

for (const b of $$('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang === 'en' ? 'en' : 'sr'));
setLang(initialLang());
