import { useEffect, useState } from 'react';
import type { EpisodesById, GeoData, PlacesById } from '../types/events';
import { indexById } from '../types/events';

/** Which dataset to load. Phase 3 swaps the default for 'geo-events.json' — same shape. */
export const DATASETS = {
  sample: 'data/geo-events.sample.json',
  full: 'data/geo-events.json',
  stress: 'data/geo-events.stress.json',
} as const;

export type DatasetName = keyof typeof DATASETS;

export const DEFAULT_DATASET: DatasetName = 'sample';

/**
 * `?data=stress` loads the synthetic density dataset (see scripts/make-stress-data.mjs);
 * `?data=full` the real full set once it exists. Anything else falls back to the sample,
 * so a bad URL can never break the deployed app.
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
