import { useState } from 'react';
import { ERAS } from '../../config/eras';
import { eraWindow } from '../../lib/camera';
import { pick, t } from '../../lib/i18n';
import { useFilters } from '../../state/FilterContext';
import { useTime } from '../../state/TimeContext';

/**
 * The legend (HANDOFF §9): colour is era, so it lists the five eras — each one a button that
 * narrows the timeline to that era — and the two marker states the colour cannot tell apart.
 */
export default function EraLegend() {
  const { lang } = useFilters();
  const { bounds, setRange } = useTime();
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button type="button" className="era-legend era-legend--closed" onClick={() => setOpen(true)} aria-expanded={false}>
        {t(lang, 'legend')}
      </button>
    );
  }
  return (
    <section className="era-legend" aria-label={t(lang, 'legend')}>
      <header className="era-legend__head">
        <h2 className="hc-label">{t(lang, 'colourIsEra')}</h2>
        <button type="button" className="hc-link" onClick={() => setOpen(false)} aria-expanded={true}>
          {t(lang, 'hide')}
        </button>
      </header>
      <ul className="era-legend__eras">
        {ERAS.map((era) => (
          <li key={era.id}>
            <button
              type="button"
              className="era-legend__era"
              title={t(lang, 'zoomToEra')}
              onClick={() => {
                const w = eraWindow(era, bounds);
                setRange(w.from, w.to);
              }}
            >
              <span className="era-legend__swatch" style={{ background: era.color }} aria-hidden="true" />
              {pick(era.name, lang)}
            </button>
          </li>
        ))}
      </ul>
      <ul className="era-legend__states">
        <li><span className="ep-mark ep-mark--normal ep-mark--key" style={{ '--c': 'var(--tx3)' } as React.CSSProperties} aria-hidden="true" />{t(lang, 'inPeriod')}</li>
        <li><span className="ep-mark ep-mark--outside ep-mark--key" style={{ '--c': 'var(--tx3)' } as React.CSSProperties} aria-hidden="true" />{t(lang, 'outsidePeriod')}</li>
      </ul>
    </section>
  );
}
