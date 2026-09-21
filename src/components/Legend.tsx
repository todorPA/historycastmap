import { useState } from 'react';
import { useVisibleEvents } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { regionColor } from '../config/regions';
import { t } from '../lib/i18n';

/** Above this many entries the legend would cover the map, so the rest collapses. */
const MAX_ROWS = 8;

/**
 * Colour key for the markers. Keyed on region, not episode: with 55 episodes (heading for
 * 181) sharing 9 hues, an episode legend claims distinctions the map can't make. See
 * config/regions.ts.
 */
export default function Legend() {
  const visible = useVisibleEvents();
  const { lang } = useFilters();
  const [expanded, setExpanded] = useState(false);

  const counts = visible.reduce<Record<string, number>>((acc, e) => {
    const key = e.region || '—';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Only what's on the map right now, busiest first.
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return null;

  const overflow = rows.length - MAX_ROWS;
  const shown = expanded ? rows : rows.slice(0, MAX_ROWS);

  return (
    <div className="legend">
      <div className="legend__title">{t(lang, 'legend')}</div>
      <ul className="legend__list">
        {shown.map(([region, count]) => (
          <li key={region} className="legend__item">
            <span className="legend__swatch" style={{ background: regionColor(region) }} />
            <span className="legend__label">{region}</span>
            <span className="legend__count">{count}</span>
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
