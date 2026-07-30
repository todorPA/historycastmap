import { BASEMAPS } from '../config/basemaps';
import { useFilters } from '../state/FilterContext';
import { useTime } from '../state/TimeContext';
import { t } from '../lib/i18n';
import { formatYear } from '../lib/time';

/**
 * Modern ↔ Historical basemap toggle. Sits over the map, top-right; when a time-aware
 * layer is active it also shows which year the borders are drawn for, because OHM coverage
 * is patchy and users need to know what they're looking at.
 */
export default function BasemapSwitcher() {
  const { lang, basemapId, setBasemapId } = useFilters();
  const { focusYear } = useTime();
  const active = BASEMAPS.find((b) => b.id === basemapId) ?? BASEMAPS[0];

  // Nothing to switch between: don't take up map with a one-button toggle.
  if (BASEMAPS.length < 2) return null;

  return (
    <div className="basemap">
      <div className="basemap__row" role="group" aria-label={t(lang, 'basemap')}>
        {BASEMAPS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`basemap__btn${b.id === basemapId ? ' is-active' : ''}`}
            aria-pressed={b.id === basemapId}
            onClick={() => setBasemapId(b.id)}
          >
            {t(lang, b.labelKey)}
          </button>
        ))}
      </div>

      {active.kind === 'ohm' && (
        <p className="basemap__note">
          {t(lang, 'bordersFor')} <strong>{formatYear(focusYear, lang)}</strong>
          <br />
          {t(lang, 'ohmCoverage')}
        </p>
      )}

      {active.noteKey && <p className="basemap__note">{t(lang, active.noteKey)}</p>}
    </div>
  );
}
