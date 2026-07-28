import { useState } from 'react';
import { useData, useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';

/** Above this many entries the legend would cover the map, so it collapses by default. */
const MAX_ROWS = 8;

/** Episode colour key for the markers, bottom-left of the map. */
export default function Legend() {
  const { data } = useData();
  const visible = useVisibleEvents();
  const { lang, activeEpisodeId } = useFilters();
  const [expanded, setExpanded] = useState(false);

  const countByEpisode = visible.reduce<Record<string, number>>((acc, e) => {
    acc[e.episodeId] = (acc[e.episodeId] ?? 0) + 1;
    return acc;
  }, {});

  // Only episodes actually on the map right now, busiest first — with 181 episodes a
  // full list is noise, not a key.
  const present = data.episodes
    .filter((ep) => (activeEpisodeId ? ep.id === activeEpisodeId : countByEpisode[ep.id] > 0))
    .sort((a, b) => (countByEpisode[b.id] ?? 0) - (countByEpisode[a.id] ?? 0));

  if (present.length === 0) return null;

  const overflow = present.length - MAX_ROWS;
  const rows = expanded ? present : present.slice(0, MAX_ROWS);

  return (
    <div className="legend">
      <div className="legend__title">{t(lang, 'legend')}</div>
      <ul className="legend__list">
        {rows.map((ep) => (
          <li key={ep.id} className="legend__item">
            <span className="legend__swatch" style={{ background: ep.color ?? '#7f8c8d' }} />
            <span className="legend__label">{pick(ep.title, lang)}</span>
            <span className="legend__count">{countByEpisode[ep.id] ?? 0}</span>
          </li>
        ))}
      </ul>

      {overflow > 0 && (
        <button type="button" className="legend__more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? t(lang, 'showLess') : `+${overflow} ${t(lang, 'more')}`}
        </button>
      )}

      <div className="legend__note legend__note--dashed">
        {t(lang, 'confidence')}: {t(lang, 'confidenceLow')}
      </div>
    </div>
  );
}
