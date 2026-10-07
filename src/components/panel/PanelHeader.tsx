import { t } from '../../lib/i18n';
import { universeLine } from '../../lib/panelModel';
import { useEpisodes } from '../../state/DataContext';
import { useFilters } from '../../state/FilterContext';
import LangToggle from '../LangToggle';

/** Logo mark, name, language toggle, and what the archive holds (HANDOFF §4.1–4.2). */
export default function PanelHeader() {
  const { lang } = useFilters();
  const episodes = useEpisodes();
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
      </div>
      <p className="panel-head__universe">{universeLine(episodes, lang)}</p>
    </header>
  );
}
