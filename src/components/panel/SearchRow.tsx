import { forwardRef, useEffect, useRef } from 'react';
import { t } from '../../lib/i18n';
import { activeFilterCount } from '../../lib/episodeFilters';
import { useFilters } from '../../state/FilterContext';

/** True while the user is typing somewhere, so a global shortcut must not fire. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/**
 * Search box and filter button (HANDOFF §4.3, §5, §6.1).
 *
 * Keys: `/` focuses the search from anywhere, `Esc` clears it, `Enter` selects the first result.
 */
const SearchRow = forwardRef<HTMLButtonElement, {
  filtersOpen: boolean;
  onToggleFilters: () => void;
  /** Called on Enter: select the first episode the list shows. */
  onSubmit: () => void;
}>(function SearchRow({ filtersOpen, onToggleFilters, onSubmit }, buttonRef) {
  const { query, setQuery, filters, lang } = useFilters();
  const inputRef = useRef<HTMLInputElement>(null);
  const active = activeFilterCount(filters);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="search-row">
      <label className="search-row__field">
        <svg className="search-row__icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="search-row__input"
          value={query}
          placeholder={t(lang, 'searchPlaceholder')}
          aria-label={t(lang, 'searchLabel')}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              // Clearing the text is this key press's whole job: stop it before the panel's
              // handler would also close the filter panel.
              e.preventDefault();
              e.stopPropagation();
              setQuery('');
            } else if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
      </label>
      <button
        ref={buttonRef}
        type="button"
        className={`filter-btn${active > 0 || filtersOpen ? ' is-active' : ''}`}
        aria-expanded={filtersOpen}
        aria-controls="fpanel"
        aria-label={`${t(lang, 'filters')} (${active})`}
        onClick={onToggleFilters}
      >
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <path d="M3 5h12M5 9h8M7.5 13h3" />
        </svg>
        {active > 0 && <span className="hc-badge filter-btn__badge">{active}</span>}
      </button>
    </div>
  );
});

export default SearchRow;
