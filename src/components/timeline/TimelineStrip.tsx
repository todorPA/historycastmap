import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatYear } from '../../lib/time';
import { t } from '../../lib/i18n';
import type { View } from '../../lib/timelineAxis';
import { moveView, resizeView } from '../../lib/timelineWindow';
import { stripLabels } from '../../lib/timelineStrip';
import type { Lang } from '../../types/events';

type Drag = { kind: 'move' | 'l' | 'r'; x: number; start: View; yearsPerPx: number };

/** Keyboard step for the Window, as a share of its span. */
const KEY_STEP = 0.1;

/**
 * The overview strip and the Window (HANDOFF §12.6): the whole extent with a histogram of the
 * matching episodes, and the gold window that *is* the active period. Drag the body to move it,
 * a handle to resize it, click outside it to centre it there.
 */
export default function TimelineStrip({
  bounds,
  view,
  bars,
  lang,
  onChange,
  onCentre,
  onPointerDown,
}: {
  bounds: View;
  view: View;
  bars: number[];
  lang: Lang;
  /** Live, every pointer move. */
  onChange: (v: View) => void;
  /** A click outside the window: tween there. */
  onCentre: (year: number) => void;
  /** Any press: stops playback and tweens. */
  onPointerDown: () => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const span = bounds.to - bounds.from;
  const pct = (y: number) => `${((y - bounds.from) / span) * 100}%`;
  const valueText = `${formatYear(Math.round(view.from), lang)}–${formatYear(Math.round(view.to), lang)}`;

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    onPointerDown();
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const target = e.target as HTMLElement;
    const handle = target.dataset.handle as 'l' | 'r' | undefined;
    if (!target.closest('.tl-window')) {
      onCentre(bounds.from + ((e.clientX - rect.left) / rect.width) * span);
      return;
    }
    e.preventDefault();
    drag.current = { kind: handle ?? 'move', x: e.clientX, start: view, yearsPerPx: span / rect.width };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dYears = (e.clientX - d.x) * d.yearsPerPx;
    onChange(d.kind === 'move' ? moveView(d.start, dYears, bounds) : resizeView(d.start, d.kind, dYears, bounds));
  }

  function up() {
    drag.current = null;
    setDragging(false);
  }

  /** ←/→ move the window by a tenth of its span; with Shift they move only its right edge. */
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    const step = Math.max(1, (view.to - view.from) * KEY_STEP) * dir;
    onPointerDown();
    onChange(e.shiftKey ? resizeView(view, 'r', step, bounds) : moveView(view, step, bounds));
  }

  return (
    <div className="tl-strip">
      <div
        ref={trackRef}
        className={`tl-strip__track${dragging ? ' is-dragging' : ''}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="tl-strip__hist" aria-hidden="true">
          {bars.map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
        <div className="tl-strip__dim" style={{ left: 0, width: pct(view.from) }} />
        <div className="tl-strip__dim" style={{ left: pct(view.to), right: 0 }} />
        <div
          className="tl-window"
          style={{ left: pct(view.from), width: `max(6px, ${((view.to - view.from) / span) * 100}%)` }}
          role="slider"
          tabIndex={0}
          aria-label={t(lang, 'windowLabel')}
          aria-valuemin={bounds.from}
          aria-valuemax={bounds.to}
          aria-valuenow={Math.round(view.from)}
          aria-valuetext={valueText}
          title={t(lang, 'windowHint')}
          onKeyDown={key}
        >
          <span className="tl-window__grip" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <i className="tl-window__h tl-window__h--l" data-handle="l" />
          <i className="tl-window__h tl-window__h--r" data-handle="r" />
        </div>
      </div>
      <div className="tl-strip__labels" aria-hidden="true">
        {stripLabels(bounds).map((y, i) => (
          <span key={i} style={{ left: pct(y) }}>
            {formatYear(y, lang)}
          </span>
        ))}
      </div>
    </div>
  );
}
