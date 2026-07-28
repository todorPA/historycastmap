import { useFilters } from '../state/FilterContext';
import type { Lang } from '../types/events';
import { t } from '../lib/i18n';

const OPTIONS: { id: Lang; label: string }[] = [
  { id: 'sr', label: 'SR' },
  { id: 'en', label: 'EN' },
];

export default function LangToggle() {
  const { lang, setLang } = useFilters();

  return (
    <div className="lang-toggle" role="group" aria-label={t(lang, 'language')}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`lang-toggle__btn${lang === opt.id ? ' is-active' : ''}`}
          aria-pressed={lang === opt.id}
          onClick={() => setLang(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
