import { useMemo, useState } from 'react';
import { useData, useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { useTime } from '../state/TimeContext';
import { pick, t } from '../lib/i18n';
import { formatYearRange } from '../lib/time';
import LangToggle from './LangToggle';

/** Diacritic- and case-insensitive so "dusan" finds "Dušanova". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd');
}

export default function Sidebar() {
  const { data } = useData();
  const visible = useVisibleEvents();
  const { lang, activeEpisodeId, toggleEpisode, clearEpisode, setSelectedEventId } = useFilters();
  const { range, bounds, resetRange } = useTime();
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  /**
   * UrlSync already keeps the address bar current, so the current href *is* the shareable
   * link. Falls back to a manual prompt where the clipboard API is unavailable (http, or
   * a browser that refuses without a user-gesture permission).
   */
  async function copyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t(lang, 'copyLink'), url);
    }
  }

  const isFullRange = range.from === bounds.from && range.to === bounds.to;

  const countByEpisode = useMemo(
    () =>
      data.events.reduce<Record<string, number>>((acc, e) => {
        acc[e.episodeId] = (acc[e.episodeId] ?? 0) + 1;
        return acc;
      }, {}),
    [data.events],
  );

  // Matches the episode number too, so "95" jumps straight to episode 95.
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return data.episodes;
    return data.episodes.filter(
      (ep) =>
        normalize(ep.id).includes(q) ||
        normalize(ep.title.sr).includes(q) ||
        normalize(ep.title.en ?? '').includes(q),
    );
  }, [data.episodes, query]);

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <div>
          <h1 className="sidebar__title">{t(lang, 'appTitle')}</h1>
          <p className="sidebar__subtitle">{t(lang, 'appSubtitle')}</p>
        </div>
        <LangToggle />
      </header>

      <section className="sidebar__section sidebar__section--episodes">
        <h2 className="sidebar__h2">{t(lang, 'episodes')}</h2>

        <div className="search">
          <input
            type="search"
            className="search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, 'searchEpisodes')}
            aria-label={t(lang, 'searchEpisodes')}
          />
        </div>

        <ul className="episodes">
          {!query && (
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
          )}
          {filtered.map((ep) => (
            <li key={ep.id}>
              <button
                type="button"
                className={`episode${activeEpisodeId === ep.id ? ' is-active' : ''}`}
                onClick={() => toggleEpisode(ep.id)}
              >
                <span className="episode__swatch" style={{ background: ep.color ?? '#7f8c8d' }} />
                <span className="episode__title">{pick(ep.title, lang)}</span>
                <span className="episode__count">{countByEpisode[ep.id] ?? 0}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="episodes__empty">{t(lang, 'noMatches')}</li>}
        </ul>
      </section>

      <section className="sidebar__section sidebar__section--stats">
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

        <button type="button" className="btn btn--ghost" onClick={copyLink}>
          {copied ? t(lang, 'linkCopied') : t(lang, 'copyLink')}
        </button>
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
