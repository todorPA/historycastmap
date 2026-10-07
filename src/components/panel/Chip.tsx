/**
 * The one chip: filter options, active-filter row, and (Phase 3) the episode card.
 *
 * Active is never shown by colour alone (HANDOFF §6.4, §15): it gets a check mark and bold
 * text too. Disabled keeps readable text and says why in its title — dashed border, no
 * opacity fade, the native `disabled` attribute so it cannot be clicked or focused.
 */
interface ChipProps {
  label: string;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  /** Shown as the tooltip, and the reason when disabled. */
  title?: string;
  /** A removable chip ("label ×") in the active-filter row. */
  onRemove?: () => void;
  removeLabel?: string;
  onClick?: () => void;
}

export default function Chip({ label, active = false, count, disabled = false, title, onRemove, removeLabel, onClick }: ChipProps) {
  if (onRemove) {
    return (
      <button type="button" className="hc-chip hc-chip--removable" onClick={onRemove} aria-label={`${removeLabel}: ${label}`}>
        <span className="hc-chip__label">{label}</span>
        <span className="hc-chip__x" aria-hidden="true">
          ×
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`hc-chip${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {active && (
        <svg className="hc-chip__check" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.2 5 8.6 9.6 3.6" />
        </svg>
      )}
      <span className="hc-chip__label">{label}</span>
      {count !== undefined && <span className="hc-chip__count">{count}</span>}
    </button>
  );
}
