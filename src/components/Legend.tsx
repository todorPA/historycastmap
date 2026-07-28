import { useData, useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';

/** Episode colour key for the markers, bottom-left of the map. */
export default function Legend() {
  const { data } = useData();
  const visible = useVisibleEvents();
  const { lang, activeEpisodeId } = useFilters();

  const shown = activeEpisodeId
    ? data.episodes.filter((e) => e.id === activeEpisodeId)
    : data.episodes;

  const countByEpisode = visible.reduce<Record<string, number>>((acc, e) => {
    acc[e.episodeId] = (acc[e.episodeId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="legend">
      <div className="legend__title">{t(lang, 'legend')}</div>
      <ul className="legend__list">
        {shown.map((ep) => (
          <li key={ep.id} className="legend__item">
            <span className="legend__swatch" style={{ background: ep.color ?? '#7f8c8d' }} />
            <span className="legend__label">{pick(ep.title, lang)}</span>
            <span className="legend__count">{countByEpisode[ep.id] ?? 0}</span>
          </li>
        ))}
      </ul>
      <div className="legend__note legend__note--dashed">
        {t(lang, 'confidence')}: {t(lang, 'confidenceLow')}
      </div>
    </div>
  );
}
