// Data model for HistoryCast Map — mirrors geo-events.schema.json (v1.0).
// Keep in sync with the schema. Consumed by the app; produced upstream (Enchanté/LLM).

export type Lang = 'sr' | 'en';

/** Bilingual string. `sr` is required; `en` optional (fallback to sr). */
export interface LocalizedText {
  sr: string;
  en?: string;
}

export type PlaceKind =
  | 'city'
  | 'region'
  | 'country'
  | 'battle-site'
  | 'landmark'
  | 'water'
  | 'person-seat'
  | 'unknown';

export interface Place {
  id: string;              // canonical kebab-case id, e.g. "skoplje"
  name: LocalizedText;     // { sr: "Skoplje", en: "Skopje" }
  aliases?: string[];      // declension/spelling variants from transcripts
  lat: number;
  lng: number;
  kind?: PlaceKind;
}

export interface Episode {
  id: string;              // episode number as string, e.g. "09"
  title: LocalizedText;
  pubDate?: string;
  audioUrl: string;        // mp3 URL for deep-linking (#t=<seconds>)
  color?: string;          // hex color for this episode's markers
}

export type EventType =
  | 'battle'
  | 'siege'
  | 'conquest'
  | 'coronation'
  | 'treaty'
  | 'founding'
  | 'death'
  | 'birth'
  | 'reign'
  | 'uprising'
  | 'reform'
  | 'other';

export type Confidence = 'high' | 'medium' | 'low';

export interface HistoryEvent {
  id: string;                    // stable slug, e.g. "kosovska-bitka-1389"
  title: LocalizedText;
  year: number;                  // BC negative (-431 = 431 BC), AD positive
  yearEnd?: number | null;       // end year for a span; null/absent = point event
  placeId: string;               // -> Place.id
  episodeId: string;             // -> Episode.id
  timestamp?: string;            // "MM:SS" position in the episode
  type?: EventType;
  actors?: string[];             // people/peoples involved
  region?: string;               // high-level grouping for filtering
  description: LocalizedText;
  quote?: string;                // verbatim transcript sentence (provenance)
  confidence: Confidence;        // low = uncertain year/place
}

export interface GeoDataMeta {
  source: string;
  generated: string;             // ISO date-time
  count: number;
  schemaVersion?: string;
  note?: string;
}

export interface GeoData {
  meta: GeoDataMeta;
  places: Place[];
  episodes: Episode[];
  events: HistoryEvent[];
}

// ---- Convenience lookups built at load time -------------------------------
export type PlacesById = Record<string, Place>;
export type EpisodesById = Record<string, Episode>;

export function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, {});
}
