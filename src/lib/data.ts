import { useEffect, useState } from 'react';
import type { EpisodesById, GeoData, PlacesById } from '../types/events';
import { indexById } from '../types/events';

/** Which dataset to load. Phase 3 swaps this for 'data/geo-events.json' — same shape. */
export const DATA_FILE = 'data/geo-events.sample.json';

/** Resolve a data path against the deploy base (GitHub Pages serves under /historycastmap/). */
export function dataUrl(file: string = DATA_FILE): string {
  return `${import.meta.env.BASE_URL}${file}`;
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
  reload: () => void;
}

export function useGeoData(file: string = DATA_FILE): DataState {
  const [loaded, setLoaded] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch(dataUrl(file))
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
  }, [file, attempt]);

  return { loaded, error, reload: () => setAttempt((n) => n + 1) };
}
