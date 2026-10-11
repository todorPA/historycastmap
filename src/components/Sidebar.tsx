import { useRef } from 'react';
import { episodeNoun } from '../lib/plural';
import { t } from '../lib/i18n';
import { activeFilterCount } from '../lib/episodeFilters';
import { useEpisodes, useMatchingEpisodes } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { useLayout } from '../state/LayoutContext';
import PanelHeader from './panel/PanelHeader';
import SearchRow from './panel/SearchRow';
import FilterPanel from './panel/FilterPanel';
import ActiveChips from './panel/ActiveChips';
import EpisodeList, { useListOrder } from './panel/EpisodeList';
import PanelFooter from './panel/PanelFooter';

/**
 * The left panel (HANDOFF §4): header, search + filter button, active chips, count, the
 * era-grouped list, footer. The filter panel opens over everything below the search row,
 * footer included; while it is open that area is `inert`, so neither the mouse nor Tab can
 * reach what it covers.
 */
export default function Sidebar() {
  const { filters, query, setQuery, clearFilters, selectEpisode, lang } = useFilters();
  const total = useEpisodes().length;
  const shown = useMatchingEpisodes().length;
  const order = useListOrder();
  const { filtersOpen, setFiltersOpen, phone, panelOpen, sheetOpen, setSheetOpen } = useLayout();
  // Collapsed (desktop) or behind its sheet (phone): out of the tab order and the a11y tree.
  const hidden = phone ? !sheetOpen : !panelOpen;
  const filterButton = useRef<HTMLButtonElement>(null);

  const closeFilters = () => {
    setFiltersOpen(false);
    filterButton.current?.focus(); // focus returns to the button (§6.2)
  };
  const clearAll = () => {
    clearFilters();
    setQuery('');
  };
  const narrowed = activeFilterCount(filters) > 0 || query.trim() !== '';

  return (
    <aside
      className="panel"
      inert={hidden}
      // Esc closes the filter panel wherever focus is — the search row and header stay
      // reachable while it is open, and a handler on the panel alone missed them. The search
      // box keeps Esc for clearing its text and stops it there (SearchRow).
      // On phone the panel is a full-screen sheet over everything else: a modal dialog (§19).
      role={phone ? 'dialog' : undefined}
      aria-modal={phone && sheetOpen ? true : undefined}
      aria-label={phone ? t(lang, 'episodes') : undefined}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        if (filtersOpen) {
          e.stopPropagation();
          closeFilters();
        } else if (phone && sheetOpen) {
          // Esc closes the sheet too — after the filter panel, if that is open.
          e.stopPropagation();
          setSheetOpen(false);
        }
      }}
    >
      <PanelHeader />
      <SearchRow
        ref={filterButton}
        filtersOpen={filtersOpen}
        onToggleFilters={() => (filtersOpen ? closeFilters() : setFiltersOpen(true))}
        onSubmit={() => order[0] && selectEpisode(order[0].id)}
      />
      <div className="panel__stack">
        <div className="panel__content" inert={filtersOpen}>
          <ActiveChips />
          <p className="panel__count">
            <b>{shown}</b>
            {narrowed ? ` / ${total} ${episodeNoun(total, lang)}` : ` ${episodeNoun(shown, lang)}`}
          </p>
          <EpisodeList onClearAll={clearAll} />
          {/* Inside the covered area, so the open filter panel hides it and `inert` takes its
              link and button out of the tab order (§6.2: the panel reaches the bottom). */}
          <PanelFooter />
        </div>
        <FilterPanel open={filtersOpen} onClose={closeFilters} />
      </div>
    </aside>
  );
}
