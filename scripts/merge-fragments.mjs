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
let episodeMetaByNumber = new Map();
if (EPISODES_SOURCE && fs.existsSync(EPISODES_SOURCE)) {
  const eps = JSON.parse(fs.readFileSync(EPISODES_SOURCE, "utf-8"));
  for (const ep of eps) {
    const m = /^(\d+)\s*[-=]\s*(.+)$/.exec(ep.title || "");
    if (m) {
      const num = String(parseInt(m[1], 10));
      episodeMetaByNumber.set(num, {
        title: m[2].trim(),
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
  .sort((a, b) => Number(a) - Number(b))
  .map((id, idx) => {
    const meta = episodeMetaByNumber.get(String(Number(id)));
    return {
      id,
      title: { sr: meta?.title || `Epizoda ${id}` },
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
console.log(`  -> ${OUT}`);
