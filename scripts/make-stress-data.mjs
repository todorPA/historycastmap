#!/usr/bin/env node
// Generates a synthetic stress dataset with the same shape as geo-events.sample.json,
// to see real marker density and a long episode list before the full data lands (Phase 3).
//
//   node scripts/make-stress-data.mjs [events] [episodes] > public/data/geo-events.stress.json
//
// NOT real history — titles are generated. Never ship this as the default dataset.

const EVENT_COUNT = Number(process.argv[2] ?? 260);
const EPISODE_COUNT = Number(process.argv[3] ?? 32);

// Deterministic PRNG (mulberry32) so repeated runs produce identical output — a stable
// file keeps diffs and visual comparisons meaningful.
let seed = 0x48435f31;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pickOne = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// Real anchor cities, so density looks like the real thing: clustered on the Balkans,
// thinning out across Europe and the Near East.
const ANCHORS = [
  ['Beograd', 'Belgrade', 44.8125, 20.4612, 'Balkan', 14],
  ['Niš', 'Niš', 43.3209, 21.8958, 'Balkan', 9],
  ['Skoplje', 'Skopje', 41.9981, 21.4254, 'Balkan', 9],
  ['Solun', 'Thessaloniki', 40.6401, 22.9444, 'Vizantija', 8],
  ['Carigrad', 'Constantinople', 41.0082, 28.9784, 'Vizantija', 12],
  ['Ohrid', 'Ohrid', 41.1172, 20.8019, 'Balkan', 6],
  ['Kotor', 'Kotor', 42.4247, 18.7712, 'Balkan', 5],
  ['Dubrovnik', 'Dubrovnik', 42.6507, 18.0944, 'Balkan', 6],
  ['Budim', 'Buda', 47.4979, 19.0402, 'Ugarska', 7],
  ['Venecija', 'Venice', 45.4408, 12.3155, 'Zapadna Evropa', 7],
  ['Rim', 'Rome', 41.9028, 12.4964, 'Zapadna Evropa', 8],
  ['Beč', 'Vienna', 48.2082, 16.3738, 'Srednja Evropa', 6],
  ['Pariz', 'Paris', 48.8566, 2.3522, 'Zapadna Evropa', 6],
  ['London', 'London', 51.5074, -0.1278, 'Britanija', 6],
  ['Jork', 'York', 53.9599, -1.0873, 'Britanija', 4],
  ['Kijev', 'Kyiv', 50.4501, 30.5234, 'Istočna Evropa', 5],
  ['Novgorod', 'Novgorod', 58.5215, 31.2755, 'Istočna Evropa', 4],
  ['Kairo', 'Cairo', 30.0444, 31.2357, 'Bliski istok', 4],
  ['Jerusalim', 'Jerusalem', 31.7683, 35.2137, 'Bliski istok', 5],
  ['Bagdad', 'Baghdad', 33.3152, 44.3661, 'Bliski istok', 4],
  ['Kartagina', 'Carthage', 36.8528, 10.3233, 'Sredozemlje', 4],
  ['Atina', 'Athens', 37.9838, 23.7275, 'Sredozemlje', 5],
  ['Kordoba', 'Córdoba', 37.8882, -4.7794, 'Iberija', 4],
  ['Toledo', 'Toledo', 39.8628, -4.0273, 'Iberija', 3],
  ['Trondhajm', 'Trondheim', 63.4305, 10.3951, 'Skandinavski svet', 3],
  ['Upsala', 'Uppsala', 59.8586, 17.6389, 'Skandinavski svet', 3],
  ['Rejkjavik', 'Reykjavík', 64.1466, -21.9426, 'Skandinavski svet', 2],
];

const KINDS = ['city', 'region', 'battle-site', 'landmark', 'person-seat'];
const TYPES = ['battle', 'siege', 'conquest', 'coronation', 'treaty', 'founding', 'death', 'birth', 'reign', 'uprising', 'reform', 'other'];
const CONFIDENCE = ['high', 'high', 'high', 'medium', 'medium', 'low']; // ~50/33/17 split
const ACTORS = ['Stefan Dušan', 'Vizantija', 'Osmansko carstvo', 'Ugarska', 'Venecija', 'krstaši', 'Bugarska', 'Kijevska Rusija', 'Normani', 'Vikinzi', 'Papska država', 'Mongoli'];
const COLORS = ['#c0392b', '#2c3e50', '#1e8449', '#8e44ad', '#d35400', '#16a085', '#2980b9', '#b7791f', '#7f1d1d', '#4a5568'];

const SR_TITLES = ['Bitka kod', 'Opsada', 'Pad', 'Osnivanje', 'Krunisanje u', 'Ugovor u', 'Ustanak u', 'Pohod na', 'Sabor u', 'Povlačenje iz'];
const EN_TITLES = ['Battle of', 'Siege of', 'Fall of', 'Founding of', 'Coronation at', 'Treaty of', 'Uprising in', 'Campaign against', 'Council of', 'Retreat from'];

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'dj')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// --- places: each anchor gets satellites scattered around it -----------------
const places = [];
for (const [sr, en, lat, lng, region, satellites] of ANCHORS) {
  places.push({
    id: slug(sr),
    name: { sr, en },
    aliases: [`${sr}u`, `${sr}a`],
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
    kind: 'city',
    _region: region,
  });
  for (let i = 1; i <= satellites; i++) {
    // Tight spread (±0.9°) so markers genuinely overlap — that's the point of the test.
    const dLat = (rnd() - 0.5) * 1.8;
    const dLng = (rnd() - 0.5) * 2.6;
    places.push({
      id: `${slug(sr)}-okolina-${i}`,
      name: { sr: `${sr} — okolina ${i}`, en: `${en} — vicinity ${i}` },
      lat: Number((lat + dLat).toFixed(4)),
      lng: Number((lng + dLng).toFixed(4)),
      kind: pickOne(KINDS),
      _region: region,
    });
  }
}

// --- episodes ---------------------------------------------------------------
const episodes = [];
for (let i = 0; i < EPISODE_COUNT; i++) {
  const id = String(i + 1).padStart(2, '0');
  episodes.push({
    id,
    title: { sr: `Epizoda ${id}: test naslov epizode`, en: `Episode ${id}: test episode title` },
    pubDate: `20${20 + (i % 6)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
    // Real mp3 so the "Play at MM:SS" button stays clickable in the stress view.
    audioUrl:
      'https://content.rss.com/episodes/186457/1184339/rs-historycast/2023_10_22_19_22_55_792cd8d7-8db8-4be7-b9d9-a97da5e27f0c.mp3',
    color: COLORS[i % COLORS.length],
  });
}

// --- events ----------------------------------------------------------------
const events = [];
for (let i = 0; i < EVENT_COUNT; i++) {
  const place = pickOne(places);
  const episode = pickOne(episodes);
  const ti = between(0, SR_TITLES.length - 1);
  // Mostly medieval, with a BC tail to exercise negative-year formatting and the axis.
  const year = rnd() < 0.12 ? between(-600, -50) : between(600, 1500);
  const isSpan = rnd() < 0.3;
  const actorCount = between(1, 3);

  events.push({
    id: `test-${slug(place.id)}-${year}-${i}`,
    title: {
      sr: `${SR_TITLES[ti]} ${place.name.sr}`,
      en: `${EN_TITLES[ti]} ${place.name.en}`,
    },
    year,
    yearEnd: isSpan ? year + between(1, 40) : null,
    placeId: place.id,
    episodeId: episode.id,
    timestamp: `${between(0, 119)}:${String(between(0, 59)).padStart(2, '0')}`,
    type: pickOne(TYPES),
    actors: Array.from({ length: actorCount }, () => pickOne(ACTORS)).filter(
      (a, idx, arr) => arr.indexOf(a) === idx,
    ),
    region: place._region,
    description: {
      sr: `Sintetički opis događaja za test gustine markera. Mesto: ${place.name.sr}. Ovo nije stvarni istorijski podatak.`,
      en: `Synthetic event description for marker-density testing. Place: ${place.name.en}. This is not real historical data.`,
    },
    quote: rnd() < 0.5 ? 'sintetički citat iz transkripta za proveru preloma teksta' : undefined,
    confidence: pickOne(CONFIDENCE),
  });
}

for (const p of places) delete p._region;

const out = {
  meta: {
    source: 'SYNTHETIC — generated by scripts/make-stress-data.mjs. Not real history.',
    generated: '2026-07-28T00:00:00Z',
    count: events.length,
    schemaVersion: '1.0',
    note: 'Stress/design dataset: marker density, long episode list, BC years, spans. Never ship as default.',
  },
  places,
  episodes,
  events,
};

process.stdout.write(JSON.stringify(out, null, 1));
