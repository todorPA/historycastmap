import { useEffect, useMemo, useRef } from 'react';
import { useGeoData } from './lib/data';
import { parseUrlState } from './lib/urlState';
import { DataProvider, useData } from './state/DataContext';
import { TimeProvider } from './state/TimeContext';
import { FilterProvider, useFilters } from './state/FilterContext';
import { t } from './lib/i18n';
import { collectionSpan, getCollection, validateCollections } from './config/collections';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import TimelineView from './components/TimelineView';
import UrlSync from './components/UrlSync';

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="app__main">
        <MapView />
        <TimelineView />
      </main>
    </div>
  );
}

/** The smallest span covering every given span, or null if there are none. */
function unionSpan(spans: Array<{ from: number; to: number } | null>): { from: number; to: number } | null {
  const real = spans.filter((s): s is { from: number; to: number } => s !== null);
  if (real.length === 0) return null;
  return { from: Math.min(...real.map((s) => s.from)), to: Math.max(...real.map((s) => s.to)) };
}

/**
 * A link that names an event but no episode (`?e=` from before episodes were selectable)
 * selects that event's episode once the data is in. Renders nothing.
 */
function SelectLinkedEvent({ urlState }: { urlState: ReturnType<typeof parseUrlState> }) {
  const { data } = useData();
  const { selectEpisode, setSelectedEventId } = useFilters();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || urlState.episodeId || !urlState.eventId) return;
    done.current = true;
    const event = data.events.find((e) => e.id === urlState.eventId);
    if (!event) return;
    // selectEpisode clears the selected event (right for a fresh pick, wrong here), so the
    // event is set again after it; both land in one render, and the last update wins.
    selectEpisode(event.episodeId);
    setSelectedEventId(event.id);
  }, [data.events, urlState, selectEpisode, setSelectedEventId]);
  return null;
}

/** Status screens need the language toggle's default, so they live inside FilterProvider. */
function Loader({ urlState }: { urlState: ReturnType<typeof parseUrlState> }) {
  const { lang } = useFilters();
  const { loaded, error, reload } = useGeoData(urlState.dataset);

  if (error) {
    return (
      <div className="status status--error">
        <p>{t(lang, 'loadError')}</p>
        <code>{error}</code>
        <button type="button" className="btn" onClick={reload}>
          {t(lang, 'retry')}
        </button>
      </div>
    );
  }

  if (!loaded) return <div className="status">{t(lang, 'loading')}</div>;

  // Collections are hand-authored against a dataset produced upstream, so this is the one
  // seam where the two can silently drift. A stale id must not shrink a collection quietly.
  const missing = validateCollections(new Set(loaded.data.episodes.map((e) => e.id)));
  if (missing.length > 0) {
    console.warn(`collections reference ${missing.length} unknown episode id(s):`, missing);
  }

  /**
   * An explicit period in the link always wins. Failing that, a link that names collections
   * opens framed on all of them together, so `?col=antika` shows Antiquity rather than the
   * whole axis with the collection bunched against one edge.
   */
  const initialRange =
    urlState.from != null && urlState.to != null
      ? { from: urlState.from, to: urlState.to }
      : unionSpan(
          (urlState.collections ?? []).map((id) => {
            const c = getCollection(id);
            return c ? collectionSpan(c, loaded.data.events) : null;
          }),
        );

  return (
    <DataProvider value={loaded}>
      <SelectLinkedEvent urlState={urlState} />
      <TimeProvider bounds={loaded.bounds} initialRange={initialRange}>
        <UrlSync dataset={urlState.dataset} />
        <Shell />
      </TimeProvider>
    </DataProvider>
  );
}

export default function App() {
  // Read once at startup: afterwards the app owns the state and writes it back to the URL.
  const urlState = useMemo(() => parseUrlState(window.location.search), []);

  return (
    <FilterProvider
      initial={{
        lang: urlState.lang,
        collections: urlState.collections,
        episodeId: urlState.episodeId,
        eventId: urlState.eventId,
        basemapId: urlState.basemapId,
        regions: urlState.regions,
        types: urlState.types,
        series: urlState.series,
      }}
    >
      <Loader urlState={urlState} />
    </FilterProvider>
  );
}
