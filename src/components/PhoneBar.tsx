import { t } from '../lib/i18n';
import { useFilters } from '../state/FilterContext';
import { useLayout } from '../state/LayoutContext';

/** Phone top bar (HANDOFF §19): mark, name, and search, which opens the panel as a sheet. */
export default function PhoneBar() {
  const { lang } = useFilters();
  const { openSearch } = useLayout();
  return (
    <header className="phone-bar">
      <span className="hc-mark hc-mark--sm" aria-hidden="true">
        HC
      </span>
      <span className="phone-bar__name">
        HistoryCast <span>Mapa</span>
      </span>
      <button type="button" className="hc-icon-btn phone-bar__search" onClick={openSearch} aria-label={t(lang, 'searchLabel')}>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
      </button>
    </header>
  );
}
