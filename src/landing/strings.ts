import { agreeSr, episodeCount, episodeNoun } from '../lib/plural';
import type { Lang } from '../types/events';
import type { ArchiveStats } from './archiveStats';
import { BASE } from './baseStrings';

export type LandingKey = keyof (typeof BASE)['sr'] | NumberedKey | RoleKey | AltKey | AriaKey;
type NumberedKey = 'meta_title' | 'meta_desc' | 'c_p' | 's1n' | 's1l' | 's2n' | 's2l' | 's3n' | 's3l' | 'u_ep_n' | 'u_ch_n' | 'growCap' | 'growEnd';
type RoleKey = 'role_hist' | 'role_art_f' | 'role_art_m' | 'role_prod';
type AltKey = keyof typeof ALT_SR;
type AriaKey = keyof typeof ARIA_SR;

/** Accessible names for groups and controls, so assistive technology hears one language. */
const ARIA_SR = {
  aria_brand: 'HistoryCast Mapa istorije',
  aria_nav: 'Sadržaj',
  aria_menu: 'Meni',
  aria_layers: 'Slojevi',
  aria_count: 'Brojanje',
  aria_markers: 'Oznake na mapi',
  aria_flow: 'Tok',
} as const;
const ARIA_EN: Record<AriaKey, string> = {
  aria_brand: 'HistoryCast History map',
  aria_nav: 'Contents',
  aria_menu: 'Menu',
  aria_layers: 'Layers',
  aria_count: 'Count by',
  aria_markers: 'Marks on the map',
  aria_flow: 'Flow',
};

/** Screenshot descriptions; the design had Serbian only. */
const ALT_SR = {
  alt_mk_ep: 'Oznaka epizode',
  alt_mk_ch: 'Oznaka poglavlja',
  alt_a_map: 'Mapa: epizoda Vikinzi označena na Lindisfarnu, sa numerisanim poglavljima',
  alt_a_panel: 'Levi panel: lista epizoda, izabrana epizoda Vikinzi',
  alt_a_tl: 'Vremenska osa: Vikinzi, 793–1066, među drugim epizodama tog perioda',
  alt_t_search: 'Pretraga Beograd: pogodak u poglavlju epizode Pad Berlina',
  alt_t_map: 'Mapa: oznaka epizode Pad Berlina i numerisana poglavlja po Evropi',
  alt_t_card: 'Lista poglavlja epizode sa vremenskim oznakama',
  alt_app: 'Cela aplikacija: levi panel, mapa i vremenska osa',
} as const;
const ALT_EN: Record<AltKey, string> = {
  alt_mk_ep: 'Episode marker',
  alt_mk_ch: 'Chapter marker',
  alt_a_map: 'Map: the episode Vikinzi (Vikings) marked at Lindisfarne, with numbered chapters',
  alt_a_panel: 'Left panel: the episode list, with the episode Vikinzi selected',
  alt_a_tl: 'Timeline: Vikinzi, 793–1066, among other episodes of the period',
  alt_t_search: 'Search for Beograd: a hit in a chapter of the episode Pad Berlina (Fall of Berlin)',
  alt_t_map: 'Map: the episode Pad Berlina and its numbered chapters across Europe',
  alt_t_card: 'The episode’s chapter list with timestamps',
  alt_app: 'The whole app: left panel, map and timeline',
};

const chapterNoun = (n: number, lang: Lang) =>
  lang === 'en' ? (n === 1 ? 'chapter' : 'chapters') : agreeSr(n, ['poglavlje', 'poglavlja', 'poglavlja']);
const placeNoun = (n: number, lang: Lang) => (lang === 'en' ? (n === 1 ? 'place' : 'places') : agreeSr(n, ['mesto', 'mesta', 'mesta']));
const eventNoun = (n: number, lang: Lang) => (lang === 'en' ? (n === 1 ? 'event' : 'events') : agreeSr(n, ['događaj', 'događaja', 'događaja']));

/**
 * Every string on the landing page, in both languages. Text from the design (baseStrings.ts);
 * numbers from the data, with nouns that agree with them — "742 poglavlja", "279 mesta".
 * The build fills index.html with the Serbian set (vite.config.ts), the page script swaps in
 * English, so there is one copy of each string.
 */
export function landingStrings(stats: ArchiveStats): Record<Lang, Record<LandingKey, string>> {
  const { episodes: e, chapters: c, places: p } = stats;
  const numbered = (lang: Lang): Record<NumberedKey, string> => ({
    meta_title: lang === 'en' ? 'HistoryCast Map — the podcast archive in place and time' : 'HistoryCast Mapa — arhiva podkasta u prostoru i vremenu',
    meta_desc:
      lang === 'en'
        ? `${c} ${chapterNoun(c, 'en')} from ${episodeCount(e, 'en')} of the HistoryCast podcast, on a map and a timeline. Each chapter plays from its minute in the episode.`
        : `${c} ${chapterNoun(c, 'sr')} iz ${e} ${agreeSr(e, ['epizode', 'epizoda', 'epizoda'])} podkasta HistoryCast, na mapi i vremenskoj osi. Svako poglavlje se sluša od svog minuta u epizodi.`,
    c_p:
      lang === 'en'
        ? `${episodeCount(e, 'en')}, ${c} ${chapterNoun(c, 'en')} and ${p} ${placeNoun(p, 'en')}, spread across two and a half thousand years.`
        : `${episodeCount(e, 'sr')}, ${c} ${chapterNoun(c, 'sr')} i ${p} ${placeNoun(p, 'sr')}, raspoređenih kroz dve i po hiljade godina.`,
    s1n: String(c),
    s1l: eventNoun(c, lang),
    s2n: String(e),
    s2l: episodeNoun(e, lang),
    s3n: String(p),
    s3l: lang === 'en' ? 'places on the map' : `${placeNoun(p, 'sr')} na mapi`,
    u_ep_n: String(e),
    u_ch_n: String(c),
    growCap: lang === 'en' ? 'Episodes on the map by publication date, cumulative' : 'Epizode na mapi po datumu objavljivanja, zbirno',
    growEnd: episodeCount(e, lang),
  });
  const roles: Record<Lang, Record<RoleKey, string>> = {
    sr: { role_hist: 'Istoričar, autor i voditelj', role_art_f: 'Istoričarka umetnosti', role_art_m: 'Istoričar umetnosti', role_prod: 'Produkcija podkasta' },
    en: { role_hist: 'Historian, author and presenter', role_art_f: 'Art historian', role_art_m: 'Art historian', role_prod: 'Podcast production' },
  };
  return {
    sr: { ...BASE.sr, ...numbered('sr'), ...roles.sr, ...ALT_SR, ...ARIA_SR },
    en: { ...BASE.en, ...numbered('en'), ...roles.en, ...ALT_EN, ...ARIA_EN },
  };
}

/** The century chart's own phrases, which take numbers the chart computes. */
export const chartText = {
  sr: {
    peak: (share: number, n: number, total: number, century: string) => `${century}: ${n} od ${total} (${share}%)`,
    /** `from`: the first century with an episode, already in the genitive ("6. veka p.n.e."). */
    emptyEpisodes: (k: number, from: string) => `${k} ${agreeSr(k, ['vek', 'veka', 'vekova'])} bez ijedne epizode (od ${from})`,
    emptyChapters: (k: number) => `${k} ${agreeSr(k, ['vek', 'veka', 'vekova'])} bez poglavlja`,
    century: (c: number) => (c < 0 ? `${-c / 100}. vek p.n.e.` : `${c / 100 + 1}. vek`),
    centuryFrom: (c: number) => (c < 0 ? `${-c / 100}. veka p.n.e.` : `${c / 100 + 1}. veka`),
    tick: (c: number) => (c < 0 ? `${-c}. p.n.e.` : String(c)),
    count: (n: number, unit: 'ep' | 'ch') => (unit === 'ep' ? episodeCount(n, 'sr') : `${n} ${chapterNoun(n, 'sr')}`),
    unitName: (unit: 'ep' | 'ch') => (unit === 'ep' ? 'epizode' : 'poglavlja'),
    centuryHead: 'Vek',
    totalHead: 'Ukupno',
    quarterHead: 'Tromesečje',
    addedHead: 'Novih epizoda',
  },
  en: {
    peak: (share: number, n: number, total: number, century: string) => `${century}: ${n} of ${total} (${share}%)`,
    emptyEpisodes: (k: number, from: string) => `${k} ${k === 1 ? 'century' : 'centuries'} without a single episode (from the ${from} on)`,
    emptyChapters: (k: number) => `${k} ${k === 1 ? 'century' : 'centuries'} without a chapter`,
    century: (c: number) => {
      const n = c < 0 ? -c / 100 : c / 100 + 1;
      const s = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
      return c < 0 ? `${n}${s} century BC` : `${n}${s} century`;
    },
    centuryFrom: (c: number): string => chartText.en.century(c),
    tick: (c: number) => (c < 0 ? `${-c} BC` : String(c)),
    count: (n: number, unit: 'ep' | 'ch') => (unit === 'ep' ? episodeCount(n, 'en') : `${n} ${chapterNoun(n, 'en')}`),
    unitName: (unit: 'ep' | 'ch') => (unit === 'ep' ? 'episodes' : 'chapters'),
    centuryHead: 'Century',
    totalHead: 'Total',
    quarterHead: 'Quarter',
    addedHead: 'New episodes',
  },
};
