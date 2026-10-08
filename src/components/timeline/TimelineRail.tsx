import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { EpisodeView } from '../../lib/episodeModel';
import { t } from '../../lib/i18n';
import { scrollBehavior } from '../../lib/motion';
import { moreBelowLabel } from '../../lib/plural';
import type { Row } from '../../lib/timelineLayout';
import { itemsBelow, railThumb, railToScroll } from '../../lib/timelineStrip';
import type { Lang } from '../../types/events';

const RAIL_INSET = 4;
const EDGE = 4;

/**
 * The rows' vertical dimension made visible without hovering (HANDOFF §12.7): a custom rail
 * (macOS hides overlay scrollbars), fading edges where there is more, and a pill counting the
 * episodes below. Overlays the rows viewport; the native scrollbar is hidden by CSS.
 */
export default function TimelineRail({
  scrollRef,
  rows,
  lanePx,
  lang,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  rows: Row<EpisodeView>[];
  lanePx: number;
  lang: Lang;
}) {
  const [m, setM] = useState({ scrollTop: 0, clientHeight: 0, scrollHeight: 0 });
  const [dragging, setDragging] = useState(false);
  const grab = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const read = () => setM({ scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight });
    read();
    el.addEventListener('scroll', read, { passive: true });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', read);
      ro.disconnect();
    };
  }, [scrollRef]);

  const railPx = m.clientHeight - 2 * RAIL_INSET;
  const thumb = railThumb({ ...m, railPx });
  if (!thumb) return null;

  const atTop = m.scrollTop < EDGE;
  const atEnd = m.scrollTop + m.clientHeight >= m.scrollHeight - EDGE;
  const below = itemsBelow(rows, lanePx, m.scrollTop + m.clientHeight);
  const up = atEnd || below === 0;

  function scrollTo(clientY: number, rail: HTMLElement) {
    const el = scrollRef.current;
    if (!el) return;
    const rect = rail.getBoundingClientRect();
    el.scrollTop = railToScroll({ y: clientY - rect.top, grab: grab.current, thumb: thumb!.height, railPx, clientHeight: m.clientHeight, scrollHeight: m.scrollHeight });
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const rail = e.currentTarget;
    const onThumb = (e.target as HTMLElement).classList.contains('tl-rail__thumb');
    // On the thumb, keep the point you grabbed under the pointer; on the track, centre it there.
    grab.current = onThumb ? e.clientY - rail.getBoundingClientRect().top - thumb!.top : thumb!.height / 2;
    scrollTo(e.clientY, rail);
    setDragging(true);
    rail.setPointerCapture(e.pointerId);
  }

  function pill() {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: up ? -el.scrollHeight : el.clientHeight * 0.8, behavior: scrollBehavior() });
  }

  return (
    <>
      <div className={`tl-fade tl-fade--top${atTop ? '' : ' is-on'}`} aria-hidden="true" />
      <div className={`tl-fade tl-fade--bot${atEnd ? '' : ' is-on'}`} aria-hidden="true" />
      <div
        className={`tl-rail${dragging ? ' is-drag' : ''}`}
        aria-hidden="true"
        onPointerDown={down}
        onPointerMove={(e) => dragging && scrollTo(e.clientY, e.currentTarget)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <div className="tl-rail__thumb" style={{ top: thumb.top, height: thumb.height }} />
      </div>
      {!(up && atTop) && (
        <button type="button" className={`tl-more${up ? ' is-up' : ''}`} onClick={pill}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d={up ? 'M12 19V5M5 12l7-7 7 7' : 'M12 5v14M5 12l7 7 7-7'} />
          </svg>
          {up ? t(lang, 'backToTop') : moreBelowLabel(below, lang)}
        </button>
      )}
    </>
  );
}
