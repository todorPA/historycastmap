import { useData, useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { useTime } from '../state/TimeContext';
import { pick, t } from '../lib/i18n';
import { formatYearRange } from '../lib/time';
import LangToggle from './LangToggle';

export default function Sidebar() {
  const { data } = useData();
  const visible = useVisibleEvents();
  const { lang, activeEpisodeId, toggleEpisode, clearEpisode, setSelectedEventId } = useFilters();
  const { range, bounds, resetRange } = useTime();

  const isFullRange = range.from === bounds.from && range.to === bounds.to;

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <div>
          <h1 className="sidebar__title">{t(lang, 'appTitle')}</h1>
          <p className="sidebar__subtitle">{t(lang, 'appSubtitle')}</p>
        </div>
        <LangToggle />
      </header>

      <section className="sidebar__section">
        <h2 className="sidebar__h2">{t(lang, 'episodes')}</h2>
        <ul className="episodes">
          <li>
            <button
              type="button"
              className={`episode${activeEpisodeId == null ? ' is-active' : ''}`}
              onClick={clearEpisode}
            >
              <span className="episode__swatch episode__swatch--all" />
              <span className="episode__title">{t(lang, 'allEpisodes')}</span>
              <span className="episode__count">{data.events.length}</span>
            </button>
          </li>
          {data.episodes.map((ep) => {
            const count = data.events.filter((e) => e.episodeId === ep.id).length;
            return (
              <li key={ep.id}>
                <button
                  type="button"
                  className={`episode${activeEpisodeId === ep.id ? ' is-active' : ''}`}
                  onClick={() => toggleEpisode(ep.id)}
                >
                  <span className="episode__swatch" style={{ background: ep.color ?? '#7f8c8d' }} />
                  <span className="episode__title">{pick(ep.title, lang)}</span>
                  <span className="episode__count">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="sidebar__section">
        <div className="stats">
          <div className="stats__row">
            <span>{t(lang, 'visibleEvents')}</span>
            <strong>
              {visible.length} {t(lang, 'of')} {data.events.length}
            </strong>
          </div>
          <div className="stats__row">
            <span>{t(lang, 'period')}</span>
            <strong>{formatYearRange(range.from, range.to, lang)}</strong>
          </div>
        </div>
        {!isFullRange && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              resetRange();
              setSelectedEventId(null);
            }}
          >
            {t(lang, 'resetRange')}
          </button>
        )}
      </section>

      <footer className="sidebar__foot">
        <a href="https://rss.com/podcasts/rs-historycast/" target="_blank" rel="noreferrer">
          HistoryCast
        </a>
        <span> · OpenStreetMap</span>
      </footer>
    </aside>
  );
}
