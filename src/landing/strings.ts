import { agreeSr, episodeCount, episodeNoun } from '../lib/plural';
import type { Lang } from '../types/events';
import type { ArchiveStats } from './archiveStats';
import { BASE } from './baseStrings';

export type LandingKey = keyof (typeof BASE)['sr'] | NumberedKey | RoleKey;
type NumberedKey = 'c_p' | 's1n' | 's1l' | 's2n' | 's2l' | 's3n' | 's3l' | 'u_ep_n' | 'u_ch_n' | 'growCap' | 'growEnd';
type RoleKey = 'role_hist' | 'role_art_f' | 'role_art_m' | 'role_prod';

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
    sr: { ...BASE.sr, ...numbered('sr'), ...roles.sr },
    en: { ...BASE.en, ...numbered('en'), ...roles.en },
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
  },
};
