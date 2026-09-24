#!/usr/bin/env node
// Spaja fragments/*.json u jedan public/data/geo-events.json
// Pravilo spajanja mesta: isti id, ili se name.sr/alias jednog nalazi u aliases drugog.
// Namerno NEMA spajanja po geografskoj blizini — dva razdvojena mesta (npr. Lexington i
// Concord, 10.3 km, ili Kosovo polje i Priština, 12.4 km) bi se lažno spojila, a greška
// se ne vidi u validatoru, samo kao pogrešan marker na mapi. Spajanje isključivo po
// aliasima je jezički utemeljeno i sigurnije — ako se dva mesta ne spoje, to je vidljivo
// i lako se ručno ispravi; obrnuto nije.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRAG_DIR = path.join(ROOT, "fragments");
const EPISODES_JSON = path.join(ROOT, "..", "..", "milan-src-episodes.json"); // not used directly
const OUT = path.join(ROOT, "public", "data", "geo-events.json");

const EPISODES_SOURCE = process.env.HISTORYCAST_EPISODES_JSON;

function normStr(s) {
  return (s || "").toLowerCase().trim();
}

const fragFiles = fs
  .readdirSync(FRAG_DIR)
  .filter((f) => f.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (fragFiles.length === 0) {
  console.error("Nema fragmenata u", FRAG_DIR);
  process.exit(1);
}

const canonicalPlaces = []; // { id, name, aliases:Set, lat, lng, kind }
const allEvents = [];
const episodeIdsUsed = new Set();

function findCanonicalMatch(place) {
  const candidateStrings = new Set([
    normStr(place.id),
    normStr(place.name?.sr),
    normStr(place.name?.en),
    ...(place.aliases || []).map(normStr),
  ]);

  for (const cp of canonicalPlaces) {
    if (cp.id === place.id) return cp;
    const cpStrings = new Set([
      normStr(cp.id),
      normStr(cp.name?.sr),
      normStr(cp.name?.en),
      ...cp.aliases,
    ]);
    for (const s of candidateStrings) {
      if (s && cpStrings.has(s)) return cp;
    }
  }
  return null;
}

const placeIdRemap = new Map(); // "episodeId::oldId" -> canonicalId

for (const file of fragFiles) {
  const full = path.join(FRAG_DIR, file);
  const data = JSON.parse(fs.readFileSync(full, "utf-8"));
  const episodeIdFromFile = path.basename(file, ".json");

  for (const p of data.places || []) {
    const match = findCanonicalMatch(p);
    if (match) {
      match.aliases.add(normStr(p.name?.sr));
      match.aliases.add(normStr(p.name?.en));
      for (const a of p.aliases || []) match.aliases.add(normStr(a));
      placeIdRemap.set(`${episodeIdFromFile}::${p.id}`, match.id);
    } else {
      const cp = {
        id: p.id,
        name: p.name,
        aliases: new Set([
          normStr(p.name?.sr),
          normStr(p.name?.en),
          ...(p.aliases || []).map(normStr),
        ]),
        lat: p.lat,
        lng: p.lng,
        kind: p.kind || "unknown",
      };
      canonicalPlaces.push(cp);
      placeIdRemap.set(`${episodeIdFromFile}::${p.id}`, cp.id);
    }
  }

  for (const e of data.events || []) {
    const canonicalPlaceId =
      placeIdRemap.get(`${episodeIdFromFile}::${e.placeId}`) || e.placeId;
    allEvents.push({ ...e, placeId: canonicalPlaceId });
    episodeIdsUsed.add(e.episodeId || episodeIdFromFile);
  }
}

// Ucitaj metapodatke epizoda (naslov/datum/audioUrl) iz historycast_episodes.json ako je dat
// Pravilo parsiranja naslova: broj epizode je prvi niz cifara NA POČETKU naslova
// (dozvoljena tačka odmah nakon cifara, npr. "75."), separator posle njega je
// nebitan — može biti "-", "=", razmak, ili ništa. Ako naslov ne počinje cifrom
// (specijali kao "Novogodišnja epizoda" ili "Drugi svetski rat, 1941 - Bitka za
// Moskvu", gde bi prva cifra u nastavku pogrešno bila uzeta za broj epizode),
// koristi se slug celog naslova. Ovo zamenjuje tri uzastopna regex-a koja su
// redom pukla na "115 = Vuk Karadžić", "75. - Stefan Prvovenčani" i
// "61 Srpska puška - od ustanika" — svi ovi oblici sada prolaze kroz isto pravilo.
//
// Klasa separatora pokriva i crte koje nisu ASCII (– —). Feed ih trenutno ne koristi:
// od 149 numerisanih naslova 145 ima "-", jedan "=", ostali razmak. Ali klasa je ono
// što sprovodi pravilo iz pasusa iznad, a "nebitan separator" koji propušta samo ASCII
// nije to pravilo. Promašaj ne bi pao na validatoru — broj epizode se i dalje izvuče,
// samo naslov zadrži vodeću crtu i tako se prikaže u aplikaciji.
const TITLE_NUMBER = /^\s*(\d+)\.?\s*[-–—=]*\s*(.*)$/;

// Serija se izvodi iz naslova u feedu, a ne iz fragmenta: feed je jedini izvor istine o tome
// kom serijalu epizoda pripada, izvođenje ovde važi retroaktivno za svih 102 postojeća
// fragmenta, i Enchanté ne mora ništa da zna o tome.
//
// Brendiranje pobeđuje numeraciju. U feedu to dvoje nije poravnato — "115 = Vuk Karadžić |
// HistoryCast nedeljom" je i numerisana i brendirana — a ni datum ne rešava spor: od 27
// brendiranih epizoda samo 15 je objavljeno nedeljom. Kad se signali ne slažu, odlučuje
// brendiranje, pa 115 napušta glavnu seriju.
//
// Specijali i nebrendirane epizode ostaju "main": to su povremene epizode glavne serije, a
// ne poseban serijal.
const SIDE_SERIES = /nedeljom|[čc]etvrtkom/i;

// Skida brendiranje iz naslova za prikaz, jer se serija sada prikazuje zasebno:
// "HistoryCast četvrtkom - Žiča" -> "Žiča", "Vuk Karadžić | HistoryCast nedeljom" -> "Vuk
// Karadžić". Radi na oba mesta jer feed koristi oba rasporeda — 4 naslova nose brend na
// početku, ostali na kraju.
const BRAND_SUFFIX = /\s*[|,\-–—]?\s*(?:\|\s*)?HistoryCast\s+(?:nedeljom|[čc]etvrtkom)\s*$/i;
const BRAND_PREFIX = /^\s*HistoryCast\s+(?:nedeljom|[čc]etvrtkom)\s*[|,\-–—]\s*/i;

function stripBranding(title) {
  const stripped = title.replace(BRAND_PREFIX, '').replace(BRAND_SUFFIX, '').trim();
  // Ako od naslova ne ostane ništa (naslov je bio samo brend), zadrži original — prazan
  // naslov u aplikaciji je gori od suvišnog brenda.
  return stripped || title.trim();
}

// \u0111 i \u0110 se moraju zameniti RU\u010cNO, pre NFD dekompozicije, i to je jedini izuzetak u srpskoj
// latinici. \u010d, \u0107, \u0161, \u017e su osnovno slovo + kombinuju\u0107i znak, pa ih NFD razdvaja i strip
// \u0300-\u036f uradi svoje. \u0111 (U+0111) je slovo s PRECRTOM \u2014 jedan nedeljiv codepoint, bez
// kombinuju\u0107eg znaka koji bi se skinuo ("\u0111".normalize("NFD").length === 1, dok je za "\u010d" 2).
// Bez ovoga \u0111 propada na [^a-z0-9]+ i postaje "-": "Kara\u0111or\u0111e" -> "kara-or-e".
//
// Proma\u0161aj ne pada na validatoru. Fragment nazvan po ta\u010dnom slugu i dalje na\u0111e metapodatke,
// samo je id ru\u017ean u deljivim ?ep= linkovima; fragment nazvan po O\u010cEKIVANOM slugu ne na\u0111e
// ni\u0161ta \u2014 naslov postane "Epizoda <id>", audioUrl ostane prazan, i "Pusti na MM:SS" tiho
// umre. Zato je ovo ispravljeno u skripti, a ne obila\u017eenjem u imenima fajlova.
const DJ = /\u0111/g;

function slugify(str) {
  return str
    .toLowerCase()
    .replace(DJ, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let episodeMetaByNumber = new Map();
let episodeMetaBySlug = new Map(); // za specijalne epizode bez broja na pocetku naslova, i za
// numerisane naslove čiji fragment ipak koristi slug id (npr. strana serija koja deli broj sa
// glavnom serijom, vidi docs/enchante-fragment-brief.md — epizode 5 i 6). Zato se SVAKI naslov
// registruje ovde, ne samo oni bez vodećeg broja: fragment po slug-u mora naći svoje metapodatke
// bez obzira da li naslov i inače počinje ciframa.
if (EPISODES_SOURCE && fs.existsSync(EPISODES_SOURCE)) {
  const eps = JSON.parse(fs.readFileSync(EPISODES_SOURCE, "utf-8"));
  for (const ep of eps) {
    const title = ep.title || "";
    // Serija se čita iz punog naslova, pre skidanja broja i brenda.
    const series = SIDE_SERIES.test(title) ? "side" : "main";
    const m = TITLE_NUMBER.exec(title);
    if (m && m[1]) {
      const num = String(parseInt(m[1], 10));
      episodeMetaByNumber.set(num, {
        title: stripBranding(m[2].trim() || title.trim()),
        series,
        pubDate: ep.pubDate,
        audioUrl: ep.audio_url,
      });
    }
    if (title) {
      episodeMetaBySlug.set(slugify(title), {
        title: stripBranding(title),
        series,
        pubDate: ep.pubDate,
        audioUrl: ep.audio_url,
      });
    }
  }
}

const PALETTE = [
  "#c0392b", "#2980b9", "#27ae60", "#8e44ad", "#d35400",
  "#16a085", "#c0392b", "#2c3e50", "#f39c12", "#7f8c8d",
];

const episodes = Array.from(episodeIdsUsed)
  .sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aIsNum = !Number.isNaN(na);
    const bIsNum = !Number.isNaN(nb);
    if (aIsNum && bIsNum) return na - nb;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return a.localeCompare(b);
  })
  .map((id, idx) => {
    const meta =
      episodeMetaByNumber.get(String(Number(id))) ||
      episodeMetaBySlug.get(id);
    return {
      id,
      title: { sr: meta?.title || `Epizoda ${id}` },
      series: meta?.series || "main",
      pubDate: meta?.pubDate || "",
      audioUrl: meta?.audioUrl || "",
      color: PALETTE[idx % PALETTE.length],
    };
  });

const places = canonicalPlaces.map((cp) => ({
  id: cp.id,
  name: cp.name,
  aliases: Array.from(cp.aliases).filter(Boolean),
  lat: cp.lat,
  lng: cp.lng,
  kind: cp.kind,
}));

const out = {
  meta: {
    source: "HistoryCast podcast (rss.com/rs-historycast)",
    generated: new Date().toISOString(),
    count: allEvents.length,
    schemaVersion: "1.0",
  },
  places,
  episodes,
  events: allEvents,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf-8");

console.log(`✓ Spojeno ${fragFiles.length} fragmenata`);
console.log(`  mesta: ${places.length}, epizode: ${episodes.length}, dogadjaji: ${allEvents.length}`);
const sideEpisodes = episodes.filter((e) => e.series === "side");
const sideEvents = allEvents.filter((e) =>
  sideEpisodes.some((s) => s.id === e.episodeId),
).length;
console.log(`  serijal: ${episodes.length - sideEpisodes.length} glavna / ${sideEpisodes.length} tematske (${sideEvents} dogadjaja)`);
console.log(`  -> ${OUT}`);
