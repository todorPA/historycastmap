import { t } from '../../lib/i18n';
import { universeLine } from '../../lib/panelModel';
import { useEpisodes } from '../../state/DataContext';
import { useFilters } from '../../state/FilterContext';
import { useLayout } from '../../state/LayoutContext';
import LangToggle from '../LangToggle';

/** Logo mark, name, language toggle, and what the archive holds (HANDOFF §4.1–4.2). */
export default function PanelHeader() {
  const { lang } = useFilters();
  const episodes = useEpisodes();
  const { phone, setPanelOpen, setSheetOpen } = useLayout();
  return (
    <header className="panel-head">
      <div className="panel-head__brand">
        <span className="hc-mark" aria-hidden="true">
          HC
        </span>
        <div>
          <h1 className="panel-head__title">HistoryCast</h1>
          <p className="panel-head__sub">{t(lang, 'mapaIstorije')}</p>
        </div>
        <LangToggle />
        {/* Desktop: collapse the column (§2). Phone: close the sheet back to the map (§19). */}
        <button
          type="button"
          className="panel-head__collapse"
          onClick={() => (phone ? setSheetOpen(false) : setPanelOpen(false))}
          aria-label={phone ? t(lang, 'close') : t(lang, 'collapsePanel')}
          title={phone ? t(lang, 'close') : t(lang, 'collapsePanel')}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d={phone ? 'M4 6l4 4 4-4' : 'M10 4 6 8l4 4'} />
          </svg>
        </button>
      </div>
      <p className="panel-head__universe">{universeLine(episodes, lang)}</p>
    </header>
  );
}
