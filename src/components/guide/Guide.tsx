import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { t, tf } from '../../lib/i18n';
import { cardPlacement, spotlightRect, type Rect } from '../../lib/guide';
import { useFilters } from '../../state/FilterContext';

/** Where each step points. Class names, not refs: the targets belong to other components. */
const FILTER_BUTTON = '.filter-btn';
const TIMELINE = '.tl';
const WINDOW = '.tl-window';
const RAIL = '.tl-rail';
const ROWS = '.tl-rows';

const rectOf = (sel: string): Rect | null => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

const box = (r: Rect) => ({ left: r.left, top: r.top, width: r.width, height: r.height });

interface Measured {
  spot: Rect;
  target: Rect;
  window?: Rect;
  rail?: Rect;
}

function measure(step: 0 | 1): Measured | null {
  if (step === 0) {
    const target = rectOf(FILTER_BUTTON);
    return target ? { target, spot: spotlightRect(target, 6) } : null;
  }
  const target = rectOf(TIMELINE);
  if (!target) return null;
  const win = rectOf(WINDOW);
  // No rail when the rows fit: point at the rows' right edge instead.
  const rows = rectOf(ROWS);
  const rail = rectOf(RAIL) ?? (rows ? { left: rows.left + rows.width - 14, top: rows.top, width: 10, height: rows.height } : null);
  return { target, spot: target, window: win ? spotlightRect(win, 4) : undefined, rail: rail ? spotlightRect(rail, 4) : undefined };
}

/**
 * The first-use guide (HANDOFF §16): two steps, a spotlight that moves between them, and a card
 * in the episode card's language. Blocks the interface while open; × or Esc closes at any step;
 * focus stays in the card.
 */
export default function Guide({ onClose }: { onClose: () => void }) {
  const { lang } = useFilters();
  const [step, setStep] = useState<0 | 1>(0);
  const [m, setM] = useState<Measured | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const place = () => setM(measure(step));
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [step]);

  // The primary action takes focus on every step (§16).
  useEffect(() => {
    const id = window.setTimeout(() => cardRef.current?.querySelector<HTMLButtonElement>('.hc-btn--primary')?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(id);
  }, [step]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const buttons = [...(cardRef.current?.querySelectorAll('button') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.shiftKey && i <= 0) {
      e.preventDefault();
      buttons[buttons.length - 1]?.focus();
    } else if (!e.shiftKey && i === buttons.length - 1) {
      e.preventDefault();
      buttons[0]?.focus();
    }
  }

  if (!m) return null;
  const place = cardPlacement(step, m.target, { width: window.innerWidth, height: window.innerHeight });
  const cardStyle =
    place.side === 'right'
      ? { left: place.left, top: place.top, width: place.width }
      : { left: place.left, bottom: place.bottom, width: place.width };

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" onKeyDown={onKeyDown}>
      <div className="guide__spot" style={box(m.spot)} />
      {step === 1 && m.window && (
        <>
          <div className="guide__ring" style={box(m.window)} />
          <span className="guide__tag" style={{ left: m.window.left + m.window.width / 2 - 26, top: m.window.top - 44 }} aria-hidden="true">
            <span>1</span>↔
          </span>
        </>
      )}
      {step === 1 && m.rail && (
        <>
          <div className="guide__ring" style={box(m.rail)} />
          <span className="guide__tag" style={{ left: m.rail.left - 64, top: m.rail.top + m.rail.height / 2 - 16 }} aria-hidden="true">
            <span>2</span>↕
          </span>
        </>
      )}

      <div ref={cardRef} className={`guide__card guide__card--${place.side}`} style={cardStyle}>
        <div className="guide__top">
          <span className="guide__step">{tf(lang, 'guideStep', { i: step + 1, n: 2 })}</span>
          <button type="button" className="hc-icon-btn" onClick={onClose} aria-label={t(lang, 'guideClose')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {step === 0 ? (
          <>
            <h2 className="guide__title" id="guide-title">{t(lang, 'guideFiltersTitle')}</h2>
            <p className="guide__body">{t(lang, 'guideFiltersBody')}</p>
            <div className="guide__actions">
              <button type="button" className="hc-link" onClick={onClose}>
                {t(lang, 'guideSkip')}
              </button>
              <button type="button" className="hc-btn hc-btn--primary" onClick={() => setStep(1)}>
                {t(lang, 'guideNext')} →
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="guide__title" id="guide-title">{t(lang, 'guideTimelineTitle')}</h2>
            <div className="guide__row">
              <span className="guide__num">1</span>
              <svg className="guide__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />
              </svg>
              <div>
                <b>{t(lang, 'guideHorizontal')}</b>
                <p>{t(lang, 'guideHorizontalBody')}</p>
              </div>
            </div>
            <div className="guide__row">
              <span className="guide__num">2</span>
              <svg className="guide__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />
              </svg>
              <div>
                <b>{t(lang, 'guideVertical')}</b>
                <p>{t(lang, 'guideVerticalBody')}</p>
              </div>
            </div>
            <div className="guide__actions">
              <button type="button" className="hc-link" onClick={() => setStep(0)}>
                ← {t(lang, 'guideBack')}
              </button>
              <button type="button" className="hc-btn hc-btn--primary" onClick={onClose}>
                {t(lang, 'guideDone')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
