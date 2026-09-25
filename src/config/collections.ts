import type { Lang, LocalizedText } from '../types/events';

/**
 * Curated entry points into the archive.
 *
 * The problem these solve: opening the explorer puts 456 events and 102 episodes in front
 * of someone who has no reason to prefer any of them. The episode list is chronological by
 * production, not by subject, so "I want the Serbian medieval stuff" means scrolling and
 * guessing. A collection is a hand-picked set of episodes with a name.
 *
 * Curation is editorial on purpose. An earlier pass grouped episodes by matching keywords
 * against their titles, which sized the idea but is too brittle to ship: "Drugi svetski rat
 * (6): Rat u Aziji i na Pacifiku" and "Rat na Pacifiku" belong together and share no useful
 * token, while "Noć dugih noževa" and "Hitlerove čistke - noć dugih noževa" are the same
 * subject under two titles. Someone has to decide. That decision lives here, in code, and
 * not in the dataset, which is produced upstream (CLAUDE.md).
 *
 * Membership is by episode id. Ids are validated at startup (see validateCollections) so a
 * renumbered episode fails loudly instead of silently shrinking a collection.
 */
export interface Collection {
  id: string;
  title: LocalizedText;
  /** One line, shown under the name. Says what is in it, not why it is good. */
  blurb: LocalizedText;
  episodeIds: string[];
}

export const COLLECTIONS: Collection[] = [
  {
    id: 'srpski-srednji-vek',
    title: { sr: 'Srpski srednji vek', en: 'Medieval Serbia' },
    blurb: {
      sr: 'Od Vlastimirovića do pada despotovine.',
      en: 'From the Vlastimirović dynasty to the fall of the despotate.',
    },
    episodeIds: ['52', '75', '56', '98', '09', '68', '43', '95', '144', '50', '102', '96'],
  },
  {
    id: 'drugi-svetski-rat',
    title: { sr: 'Drugi svetski rat', en: 'The Second World War' },
    blurb: {
      sr: 'Od Minhena do pada Berlina, na svim frontovima.',
      en: 'From Munich to the fall of Berlin, on every front.',
    },
    episodeIds: [
      '51',
      '53',
      '55',
      '57',
      'drugi-svetski-rat-1941-bitka-za-moskvu',
      '62',
      '64',
      '71',
      '77',
      '81',
      '84',
      '92',
      '99',
      '108',
      '121',
      '134',
    ],
  },
  {
    id: 'veliki-rat',
    title: { sr: 'Veliki rat', en: 'The Great War' },
    blurb: {
      sr: 'Srbija 1914-1918: od Kolubare do Solunskog fronta.',
      en: 'Serbia 1914-1918, from Kolubara to the Salonika front.',
    },
    episodeIds: ['123', '65', '73', '70', '78', '87', '91', '104'],
  },
  {
    id: 'antika',
    title: { sr: 'Antika', en: 'Antiquity' },
    blurb: {
      sr: 'Grčka, Rim i Kartagina, od Troje do Nerona.',
      en: 'Greece, Rome and Carthage, from Troy to Nero.',
    },
    episodeIds: ['136', '54', '100', '79', '89', '60', '44', '63'],
  },
  {
    id: 'moderna-srbija',
    title: { sr: 'Moderna Srbija', en: 'Modern Serbia' },
    blurb: {
      sr: 'Devetnaesti vek: ustavi, ustanci i državnici.',
      en: 'The nineteenth century: constitutions, uprisings and statesmen.',
    },
    episodeIds: ['115', '76', '58', '93', '46', '103', '61', '113', '80'],
  },
  {
    id: 'azija',
    title: { sr: 'Azija', en: 'Asia' },
    blurb: {
      sr: 'Mongolsko carstvo, Japan i ratovi dvadesetog veka.',
      en: 'The Mongol empire, Japan, and the wars of the twentieth century.',
    },
    episodeIds: ['106', '119', '47', '48', '112', '130', '83'],
  },
];

/**
 * Year span of everything in a collection, with a little air either side.
 *
 * Lives here rather than in the component that draws the chips, because the initial range
 * has to be decided before anything mounts: the timeline is constructed from whatever range
 * exists on first render, and vis then echoes that window straight back through
 * `rangechanged`. Framing from a mount effect loses that race every time.
 */
export function collectionSpan(
  collection: Collection,
  events: { episodeId: string; year: number; yearEnd?: number | null }[],
): { from: number; to: number } | null {
  const set = new Set(collection.episodeIds);
  const years: number[] = [];
  for (const e of events) {
    if (!set.has(e.episodeId)) continue;
    years.push(e.year, e.yearEnd ?? e.year);
  }
  if (years.length === 0) return null;

  const from = Math.min(...years);
  const to = Math.max(...years);
  const pad = Math.max(5, Math.round((to - from) * 0.04));
  return { from: from - pad, to: to + pad };
}

export function getCollection(id: string | null | undefined): Collection | undefined {
  return id ? COLLECTIONS.find((c) => c.id === id) : undefined;
}

export function collectionTitle(collection: Collection, lang: Lang): string {
  return (lang === 'en' ? collection.title.en : collection.title.sr) || collection.title.sr;
}

export function collectionBlurb(collection: Collection, lang: Lang): string {
  return (lang === 'en' ? collection.blurb.en : collection.blurb.sr) || collection.blurb.sr;
}

/**
 * Reports episode ids that no longer exist in the loaded dataset.
 *
 * Collections are hand-authored against a dataset that is regenerated upstream, so this is
 * the one place the two can drift apart. Surfacing it as a console warning rather than a
 * thrown error is deliberate: a stale id should not take the app down, but it must not pass
 * unnoticed either.
 */
export function validateCollections(knownEpisodeIds: Set<string>): string[] {
  const missing: string[] = [];
  for (const collection of COLLECTIONS) {
    for (const id of collection.episodeIds) {
      if (!knownEpisodeIds.has(id)) missing.push(`${collection.id} -> ${id}`);
    }
  }
  return missing;
}
