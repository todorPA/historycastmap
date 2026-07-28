import type { Lang } from '../types/events';

/** UI labels only. Content strings (titles, descriptions) come from the data. */
const dict = {
  sr: {
    appTitle: 'HistoryCast Map',
    appSubtitle: 'Mapa i vremenska osa istorijskih događaja',
    episodes: 'Epizode',
    allEpisodes: 'Sve epizode',
    visibleEvents: 'Vidljivih događaja',
    of: 'od',
    loading: 'Učitavanje podataka…',
    loadError: 'Podaci nisu mogli da se učitaju',
    retry: 'Pokušaj ponovo',
    timeline: 'Vremenska osa',
    year: 'Godina',
    period: 'Period',
    place: 'Mesto',
    region: 'Region',
    actors: 'Učesnici',
    episode: 'Epizoda',
    playAt: '▶ Slušaj od',
    close: 'Zatvori',
    confidence: 'Pouzdanost',
    confidenceHigh: 'visoka',
    confidenceMedium: 'srednja',
    confidenceLow: 'niska',
    legend: 'Legenda',
    noEvents: 'Nema događaja u izabranom periodu.',
    resetRange: 'Ceo period',
    language: 'Jezik',
    openInNewTab: 'Otvori mp3 u novom tabu',
    type: 'Tip',
    more: 'još',
    showLess: 'Prikaži manje',
    searchEpisodes: 'Pretraži epizode…',
    noMatches: 'Nema rezultata',
    resizeTimeline: 'Promeni visinu vremenske ose',
  },
  en: {
    appTitle: 'HistoryCast Map',
    appSubtitle: 'Map and timeline of historical events',
    episodes: 'Episodes',
    allEpisodes: 'All episodes',
    visibleEvents: 'Visible events',
    of: 'of',
    loading: 'Loading data…',
    loadError: 'Could not load the data',
    retry: 'Retry',
    timeline: 'Timeline',
    year: 'Year',
    period: 'Period',
    place: 'Place',
    region: 'Region',
    actors: 'Actors',
    episode: 'Episode',
    playAt: '▶ Play at',
    close: 'Close',
    confidence: 'Confidence',
    confidenceHigh: 'high',
    confidenceMedium: 'medium',
    confidenceLow: 'low',
    legend: 'Legend',
    noEvents: 'No events in the selected period.',
    resetRange: 'Full period',
    language: 'Language',
    openInNewTab: 'Open mp3 in a new tab',
    type: 'Type',
    more: 'more',
    showLess: 'Show less',
    searchEpisodes: 'Search episodes…',
    noMatches: 'No matches',
    resizeTimeline: 'Resize the timeline',
  },
} as const;

export type UiKey = keyof (typeof dict)['sr'];

export function t(lang: Lang, key: UiKey): string {
  return dict[lang][key] ?? dict.sr[key];
}

/** Pick a localized content string from data, falling back to Serbian. */
export function pick(text: { sr: string; en?: string } | undefined, lang: Lang): string {
  if (!text) return '';
  return (lang === 'en' ? text.en : text.sr) || text.sr;
}
