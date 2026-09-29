import { useEffect, useState } from 'react';
import type { EpisodesById, GeoData, PlacesById } from '../types/events';
import { indexById } from '../types/events';

/** Which dataset to load. All three share the shape in geo-events.schema.json. */
export const DATASETS = {
  sample: 'data/geo-events.sample.json',
  full: 'data/geo-events.json',
  stress: 'data/geo-events.stress.json',
} as const;

export type DatasetName = keyof typeof DATASETS;

/**
 * The full set is the default because it is the only one whose regions match the palette.
 *
 * `geo-events.sample.json` predates the closed region list and still carries five names that
 * aren't in it (Vizantija, Srpsko carstvo, Srbija, Skandinavski svet, Britanija), so every
 * event in them fell through to UNKNOWN_REGION_COLOR. On the default view that meant a mostly
 * grey map under a legend claiming to be a colour key, which reads as a broken feature rather
 * than as missing data. The full set validates with exactly the canonical twelve
 * (`npm run validate:full`).
 *
 * The sample is still reachable at `?data=sample`. Regenerating it from the full set, or
 * bringing its regions into the closed list, is an upstream data job (CLAUDE.md).
 */
export const DEFAULT_DATASET: DatasetName = 'full';

/**
 * `?data=sample` loads the three-episode prototype set, `?data=stress` the synthetic density
 * set (see scripts/make-stress-data.mjs). Anything else falls back to DEFAULT_DATASET, so a
 * bad URL can never break the deployed app.
 *
 * Own-property check, not `in`: `in` also matches inherited keys, so `?data=toString`
 * would pass and resolve to a function instead of a path.
 */
export function datasetFromLocation(search?: string): DatasetName {
  const qs = search ?? (typeof window === 'undefined' ? '' : window.location.search);
  const requested = new URLSearchParams(qs).get('data');
  return requested && Object.prototype.hasOwnProperty.call(DATASETS, requested)
    ? (requested as DatasetName)
    : DEFAULT_DATASET;
}

/** Resolve a data path against the deploy base (GitHub Pages serves under /historycastmap/). */
export function dataUrl(dataset: DatasetName): string {
  return `${import.meta.env.BASE_URL}${DATASETS[dataset]}`;
}

export interface LoadedData {
  data: GeoData;
  placesById: PlacesById;
  episodesById: EpisodesById;
  /** Full extent of the dataset in integer years — the default timeline range. */
  bounds: { from: number; to: number };
}

function yearBounds(data: GeoData): { from: number; to: number } {
  const years = data.events.flatMap((e) => (e.yearEnd == null ? [e.year] : [e.year, e.yearEnd]));
  if (years.length === 0) return { from: 0, to: 0 };
  return { from: Math.min(...years), to: Math.max(...years) };
}

export function buildLoadedData(data: GeoData): LoadedData {
  return {
    data,
    placesById: indexById(data.places),
    episodesById: indexById(data.episodes),
    bounds: yearBounds(data),
  };
}

export interface DataState {
  loaded: LoadedData | null;
  error: string | null;
  dataset: DatasetName;
  reload: () => void;
}

export function useGeoData(dataset: DatasetName = datasetFromLocation()): DataState {
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(dataUrl(dataset))
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<GeoData>;
      })
      .then((json) => {
        if (cancelled) return;
        setLoaded(buildLoadedData(json));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [dataset, attempt]);

  return { loaded, error, dataset, reload: () => setAttempt((n) => n + 1) };
}
