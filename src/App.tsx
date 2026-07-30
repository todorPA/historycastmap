import { useMemo } from 'react';
import { useGeoData } from './lib/data';
import { parseUrlState } from './lib/urlState';
import { DataProvider } from './state/DataContext';
import { TimeProvider } from './state/TimeContext';
import { FilterProvider, useFilters } from './state/FilterContext';
import { t } from './lib/i18n';
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

  const initialRange =
    urlState.from != null && urlState.to != null
      ? { from: urlState.from, to: urlState.to }
      : null;

  return (
    <DataProvider value={loaded}>
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
        episodeId: urlState.episodeId,
        eventId: urlState.eventId,
        basemapId: urlState.basemapId,
      }}
    >
      <Loader urlState={urlState} />
    </FilterProvider>
  );
}
