import { useGeoData } from './lib/data';
import { DataProvider } from './state/DataContext';
import { TimeProvider } from './state/TimeContext';
import { FilterProvider, useFilters } from './state/FilterContext';
import { t } from './lib/i18n';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import TimelineView from './components/TimelineView';

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
function Loader() {
  const { lang } = useFilters();
  const { loaded, error, reload } = useGeoData();

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

  return (
    <DataProvider value={loaded}>
      <TimeProvider bounds={loaded.bounds}>
        <Shell />
      </TimeProvider>
    </DataProvider>
  );
}

export default function App() {
  return (
    <FilterProvider>
      <Loader />
    </FilterProvider>
  );
}
