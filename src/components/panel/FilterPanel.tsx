import { useEffect, useMemo, useRef } from 'react';
import { COLLECTIONS } from '../../config/collections';
import { REGION_FAMILIES } from '../../config/regionFamilies';
import { regionLabel } from '../../config/regions';
import { EVENT_TYPES } from '../../types/events';
import { pick, t, type UiKey } from '../../lib/i18n';
import { episodeCount } from '../../lib/plural';
import { activeFilterCount, chipCounts, isChipDisabled, type FilterGroup } from '../../lib/episodeFilters';
import { matchesQuery } from '../../lib/episodeSearch';
import { useCollectionMembers, useData, useEpisodes, useMatchingEpisodes } from '../../state/DataContext';
import { useFilters } from '../../state/FilterContext';
import Chip from './Chip';

/**
 * The filter panel (HANDOFF §6.2–6.4). It slides down over the chips, count and list, and every
 * toggle applies at once — there is no Apply button, so the count on *Gotovo* is live.
 *
 * Counts are per chip: how many episodes would match if it were picked, given the other groups
 * and the search box. A chip that would yield nothing is disabled, unless it is active, so an
 * active filter can always be removed.
 */
export default function FilterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, toggleFilter, clearFilters, query, lang } = useFilters();
  const { placesById } = useData();
  const episodes = useEpisodes();
  const members = useCollectionMembers();
  const matching = useMatchingEpisodes();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus moves into the panel when it opens (§6.2); the button gets it back on close.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  const counts = useMemo(() => {
    const accept = (e: (typeof episodes)[number]) => matchesQuery(e, query, placesById, lang);
    const of = (g: FilterGroup) => chipCounts(episodes, filters, members, g, accept);
    return { collections: of('collections'), series: of('series'), regions: of('regions'), types: of('types') };
  }, [episodes, filters, members, query, placesById, lang]);

  const active = activeFilterCount(filters);

  const chip = (group: FilterGroup, value: string, label: string) => {
    const isActive = (filters[group] as string[]).includes(value);
    const count = counts[group].get(value) ?? 0;
    const disabled = isChipDisabled(count, isActive);
    return (
      <li key={value}>
        <Chip
          label={label}
          count={count}
          active={isActive}
          disabled={disabled}
          title={disabled ? t(lang, 'unavailable') : undefined}
          onClick={() => toggleFilter(group, value)}
        />
      </li>
    );
  };

  const onlyCollection = filters.collections.length === 1 ? COLLECTIONS.find((c) => c.id === filters.collections[0]) : undefined;
  // Families with several regions get a subhead; the single-region ones (Balkan, Azija) share
  // a last row without one, as in the prototype.
  const grouped = REGION_FAMILIES.filter((f) => f.regions.length > 1);
  const singles = REGION_FAMILIES.filter((f) => f.regions.length === 1).flatMap((f) => f.regions);

  return (
    <section
      id="fpanel"
      className={`fpanel${open ? ' is-open' : ''}`}
      aria-labelledby="fpanel-title"
      hidden={!open}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="fpanel__head">
        <h2 id="fpanel-title" className="fpanel__title" tabIndex={-1} ref={headingRef}>
          {t(lang, 'filters')}
          {active > 0 && <span className="hc-badge hc-badge--inline">{active}</span>}
        </h2>
        <button type="button" className="hc-icon-btn" onClick={onClose} aria-label={t(lang, 'close')}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </header>

      <div className="fpanel__body">
        <section className="fpanel__group">
          <h3 className="hc-label">{t(lang, 'collections')}</h3>
          <ul className="hc-chips">{COLLECTIONS.map((c) => chip('collections', c.id, pick(c.title, lang)))}</ul>
          {onlyCollection && <p className="fpanel__blurb">{pick(onlyCollection.blurb, lang)}</p>}
        </section>

        <section className="fpanel__group">
          <h3 className="hc-label">{t(lang, 'series')}</h3>
          <ul className="hc-chips">
            {chip('series', 'main', t(lang, 'series_main'))}
            {chip('series', 'side', t(lang, 'series_side'))}
          </ul>
        </section>

        <section className="fpanel__group">
          <h3 className="hc-label">{t(lang, 'region')}</h3>
          {grouped.map((family) => (
            <div key={family.id} className="fpanel__family">
              <h4 className="fpanel__subhead">{pick(family.name, lang)}</h4>
              <ul className="hc-chips">{family.regions.map((r) => chip('regions', r, regionLabel(r, lang)))}</ul>
            </div>
          ))}
          <ul className="hc-chips">{singles.map((r) => chip('regions', r, regionLabel(r, lang)))}</ul>
        </section>

        <section className="fpanel__group">
          <h3 className="hc-label">{t(lang, 'groupTypes')}</h3>
          <ul className="hc-chips">{EVENT_TYPES.map((type) => chip('types', type, t(lang, `type_${type}` as UiKey)))}</ul>
        </section>
      </div>

      <footer className="fpanel__foot">
        <button type="button" className="hc-link" onClick={clearFilters} disabled={active === 0}>
          {t(lang, 'clearAll')}
        </button>
        <button type="button" className="hc-btn hc-btn--primary" onClick={onClose}>
          {t(lang, 'done')} · {episodeCount(matching.length, lang)}
        </button>
      </footer>
    </section>
  );
}
