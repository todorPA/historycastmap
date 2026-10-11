import { t } from '../../lib/i18n';
import { pick } from '../../lib/i18n';
import { activeFilterCount } from '../../lib/episodeFilters';
import { useFilters } from '../../state/FilterContext';
import { useLayout } from '../../state/LayoutContext';
import type { EpisodeView } from '../../lib/episodeModel';

/**
 * With the left panel collapsed, what is left of it floats at the map's top-left (HANDOFF §2):
 * the mark, search, the active-filter badge, the selected episode (click to fly back to it), and
 * the chevron that expands the panel again.
 */
export default function MapPill({ selected, onFlyBack }: { selected: EpisodeView | null; onFlyBack: () => void }) {
  const { lang, filters, query } = useFilters();
  const { setPanelOpen, openSearch } = useLayout();
  const badge = activeFilterCount(filters) + (query.trim() ? 1 : 0);

  return (
    <div className="map-pill">
      <span className="hc-mark hc-mark--sm" aria-hidden="true">
        HC
      </span>
      <button type="button" className="map-pill__btn" onClick={openSearch} aria-label={t(lang, 'searchLabel')} title={t(lang, 'searchLabel')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
      </button>
      {badge > 0 && (
        <span className="hc-badge map-pill__badge" title={t(lang, 'filters')}>
          {badge}
        </span>
      )}
      {selected && (
        <button type="button" className="map-pill__sel" onClick={onFlyBack}>
          {pick(selected.title, lang)}
        </button>
      )}
      <button type="button" className="map-pill__btn" onClick={() => setPanelOpen(true)} aria-label={t(lang, 'openPanel')} title={t(lang, 'openPanel')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>
    </div>
  );
}
