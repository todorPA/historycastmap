import { t } from '../../lib/i18n';
import { activeChips } from '../../lib/panelModel';
import { useFilters } from '../../state/FilterContext';
import Chip from './Chip';

/** One removable chip per active filter value, then "Poništi sve" (HANDOFF §4.4). */
export default function ActiveChips() {
  const { filters, toggleFilter, clearFilters, lang } = useFilters();
  const chips = activeChips(filters, lang);
  if (chips.length === 0) return null;
  return (
    <div className="active-chips">
      <ul className="hc-chips">
        {chips.map((c) => (
          <li key={`${c.group}:${c.value}`}>
            <Chip label={c.label} onRemove={() => toggleFilter(c.group, c.value)} removeLabel={t(lang, 'removeFilter')} />
          </li>
        ))}
      </ul>
      <button type="button" className="hc-link" onClick={clearFilters}>
        {t(lang, 'clearAll')}
      </button>
    </div>
  );
}
