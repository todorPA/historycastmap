import { useEffect } from 'react';
import { useTime } from '../state/TimeContext';
import { useFilters } from '../state/FilterContext';
import type { DatasetName } from '../lib/data';
import { buildSearch, replaceUrl } from '../lib/urlState';

/** Debounced so a timeline scrub doesn't rewrite the URL on every frame. */
const WRITE_DEBOUNCE_MS = 250;

/**
 * Mirrors the current view into the query string so the URL is always shareable.
 * Renders nothing; lives inside the providers it reads from.
 */
export default function UrlSync({ dataset }: { dataset: DatasetName }) {
  const { range, bounds } = useTime();
  const { activeEpisodeId, selectedEventId, lang, basemapId } = useFilters();

  useEffect(() => {
    const id = window.setTimeout(() => {
      replaceUrl(
        buildSearch({
          dataset,
          from: range.from,
          to: range.to,
          isFullRange: range.from === bounds.from && range.to === bounds.to,
          episodeId: activeEpisodeId,
          eventId: selectedEventId,
          lang,
          basemapId,
        }),
      );
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [
    dataset,
    range.from,
    range.to,
    bounds.from,
    bounds.to,
    activeEpisodeId,
    selectedEventId,
    lang,
    basemapId,
  ]);

  return null;
}
