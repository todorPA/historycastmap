// Pravila za naslove epizoda iz RSS feeda: broj epizode, serijal, naslov za prikaz i slug.
//
// Izdvojeno iz merge-fragments.mjs da bi ista pravila mogla da se testiraju
// (scripts/lib/episode-titles.test.mjs). Svaki promašaj ovde je tih — validator ga ne vidi,
// vidi se samo u aplikaciji kao pogrešan naslov, "Epizoda <id>" ili prazan audioUrl — pa su
// testovi jedino mesto gde bi pukao glasno.

// Broj epizode je prvi niz cifara NA POČETKU naslova (dozvoljena tačka odmah nakon cifara,
// npr. "75."), separator posle njega je nebitan — može biti "-", "=", razmak, ili ništa. Ako
// naslov ne počinje cifrom (specijali kao "Novogodišnja epizoda" ili "Drugi svetski rat,
// 1941 - Bitka za Moskvu", gde bi prva cifra u nastavku pogrešno bila uzeta za broj epizode),
// koristi se slug celog naslova. Ovo zamenjuje tri uzastopna regex-a koja su redom pukla na
// "115 = Vuk Karadžić", "75. - Stefan Prvovenčani" i "61 Srpska puška - od ustanika".
//
// Klasa separatora pokriva i crte koje nisu ASCII (– —). Feed ih trenutno ne koristi, ali
// "nebitan separator" koji propušta samo ASCII nije to pravilo.
const TITLE_NUMBER = /^\s*(\d+)\.?\s*[-–—=]*\s*(.*)$/;

/**
 * Broj epizode i ostatak naslova, ili null ako naslov ne počinje cifrom.
 * Broj je normalizovan ("05" -> "5"), jer fragmenti "5.json" i "05.json" moraju naći isto.
 */
export function parseEpisodeNumber(title) {
  const m = TITLE_NUMBER.exec(title || "");
  if (!m || !m[1]) return null;
  return { number: String(parseInt(m[1], 10)), rest: m[2].trim() };
}

// Serija se izvodi iz naslova u feedu, a ne iz fragmenta: feed je jedini izvor istine o tome
// kom serijalu epizoda pripada, i ekstrakcija ne mora ništa da zna o tome.
//
// Brendiranje pobeđuje numeraciju. U feedu to dvoje nije poravnato — "115 = Vuk Karadžić |
// HistoryCast nedeljom" je i numerisana i brendirana — a ni datum ne rešava spor: od 27
// brendiranih epizoda samo 15 je objavljeno nedeljom. Kad se signali ne slažu, odlučuje
// brendiranje, pa 115 napušta glavnu seriju.
//
// Specijali i nebrendirane epizode ostaju "main": to su povremene epizode glavne serije, a
// ne poseban serijal.
const SIDE_SERIES = /nedeljom|[čc]etvrtkom/i;

/** "side" za HistoryCast četvrtkom / nedeljom, "main" za sve ostalo. Čita PUN naslov. */
export function seriesOfTitle(title) {
  return SIDE_SERIES.test(title || "") ? "side" : "main";
}

// Skida brendiranje iz naslova za prikaz, jer se serija prikazuje zasebno:
// "HistoryCast četvrtkom - Žiča" -> "Žiča", "Vuk Karadžić | HistoryCast nedeljom" -> "Vuk
// Karadžić". Radi na oba mesta jer feed koristi oba rasporeda.
const BRAND_SUFFIX = /\s*[|,\-–—]?\s*(?:\|\s*)?HistoryCast\s+(?:nedeljom|[čc]etvrtkom)\s*$/i;
const BRAND_PREFIX = /^\s*HistoryCast\s+(?:nedeljom|[čc]etvrtkom)\s*[|,\-–—]\s*/i;

export function stripBranding(title) {
  const stripped = title.replace(BRAND_PREFIX, "").replace(BRAND_SUFFIX, "").trim();
  // Ako od naslova ne ostane ništa (naslov je bio samo brend), zadrži original — prazan
  // naslov u aplikaciji je gori od suvišnog brenda.
  return stripped || title.trim();
}

/**
 * Naslov za prikaz: bez vodećeg broja epizode i bez brenda serijala. Jedna funkcija za oba
 * puta kojima merge nalazi epizodu (po broju i po slugu) — slug-put je ranije zadržavao broj,
 * pa je u listi stajalo "06 Aleksandar Makedonski".
 */
export function displayTitle(feedTitle) {
  const title = feedTitle || "";
  return stripBranding(parseEpisodeNumber(title)?.rest || title);
}

// đ se mora zameniti RUČNO, pre NFD dekompozicije, i to je jedini izuzetak u srpskoj
// latinici. č, ć, š, ž su osnovno slovo + kombinujući znak, pa ih NFD razdvaja i strip
// U+0300–U+036F uradi svoje. đ (U+0111) je slovo s PRECRTOM — jedan nedeljiv codepoint, bez
// kombinujućeg znaka koji bi se skinuo ("đ".normalize("NFD").length === 1, dok je za "č" 2).
// Bez ovoga đ propada na [^a-z0-9]+ i postaje "-": "Karađorđe" -> "kara-or-e".
// toLowerCase() ide prvo, pa isti regex pokriva i Đ.
//
// Promašaj ne pada na validatoru: fragment nazvan po OČEKIVANOM slugu ne nađe metapodatke —
// naslov postane "Epizoda <id>", audioUrl ostane prazan, i "Pusti na MM:SS" tiho umre.
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
