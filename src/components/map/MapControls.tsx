import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { DomEvent } from 'leaflet';
import { t } from '../../lib/i18n';
import { useFilters } from '../../state/FilterContext';

/**
 * Zoom and "show all", top-right (HANDOFF §2). They replace Leaflet's own zoom control so they
 * can share the panel's controls and move out of the card's way while it is open.
 */
export default function MapControls({ onShowAll }: { onShowAll: () => void }) {
  const map = useMap();
  const { lang, selectedEpisodeId } = useFilters();
  const ref = useRef<HTMLDivElement>(null);
  // These sit inside the map's container: without this, a click here would also reach the
  // map — closing the cluster list, or starting a drag.
  useEffect(() => {
    if (ref.current) {
      DomEvent.disableClickPropagation(ref.current);
      DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);
  return (
    <div ref={ref} className={`map-controls${selectedEpisodeId ? ' is-shifted' : ''}`}>
      <div className="map-controls__group">
        <button type="button" className="map-controls__btn" onClick={() => map.zoomIn()} aria-label={t(lang, 'zoomIn')} title={t(lang, 'zoomIn')}>+</button>
        <button type="button" className="map-controls__btn" onClick={() => map.zoomOut()} aria-label={t(lang, 'zoomOut')} title={t(lang, 'zoomOut')}>−</button>
      </div>
      <div className="map-controls__group">
        <button type="button" className="map-controls__btn" onClick={onShowAll} aria-label={t(lang, 'showAll')} title={t(lang, 'showAll')}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></svg>
        </button>
      </div>
    </div>
  );
}
