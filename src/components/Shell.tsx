import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GUIDE_DELAY_MS, guideSeen, markGuideSeen } from '../lib/guide';
import { useFilters } from '../state/FilterContext';
import { useLayout } from '../state/LayoutContext';
import Sidebar from './Sidebar';
import MapView from './MapView';
import Timeline from './timeline/Timeline';
import Guide from './guide/Guide';
import PhoneBar from './PhoneBar';

/**
 * The explorer's frame (HANDOFF §2, §19): panel, map, timeline. Layout state lives in classes on
 * `.app`, so the panel's collapse and the phone sheets are CSS transitions, not remounts.
 */
export default function Shell() {
  const { phone, panelOpen, setPanelOpen, setFiltersOpen, sheetOpen, setSheetOpen } = useLayout();
  const { selectedEpisodeId } = useFilters();

  /**
   * The first-use guide (§16): once per browser, 700 ms after the explorer appears, never on
   * phone, and not when a link arrives with an episode selected — that reader came for it.
   * Clears the way first: the filter panel closes, a collapsed panel opens.
   */
  const [guide, setGuide] = useState(false);
  const arrivedWithSelection = useRef(selectedEpisodeId !== null);
  useEffect(() => {
    if (phone || arrivedWithSelection.current || guideSeen()) return;
    const id = window.setTimeout(() => {
      setFiltersOpen(false);
      setPanelOpen(true);
      setGuide(true);
    }, GUIDE_DELAY_MS);
    return () => window.clearTimeout(id);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const closeGuide = () => {
    markGuideSeen();
    setGuide(false);
  };

  // Phone: picking an episode from the sheet closes it, so the card and map are what you see.
  useEffect(() => {
    if (phone && selectedEpisodeId) setSheetOpen(false);
  }, [phone, selectedEpisodeId, setSheetOpen]);

  /**
   * Phone: the sheet covers the top bar and the map, so while it is open they are `inert` — Tab
   * and screen readers stay in the sheet — and closing it returns focus to whatever opened it.
   */
  const covered = phone && sheetOpen;
  const opener = useRef<HTMLElement | null>(null);
  // A layout effect: the browser moves focus off an element that has just turned inert, so the
  // opener must be read before it gets the chance.
  useLayoutEffect(() => {
    if (covered) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    opener.current = null;
  }, [covered]);

  const classes = ['app', phone ? 'is-phone' : !panelOpen && 'is-panel-closed', phone && sheetOpen && 'is-sheet-open']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {phone && <PhoneBar inert={covered} />}
      <Sidebar />
      <main className="app__main" inert={covered}>
        <MapView />
        <Timeline />
      </main>
      {guide && !phone && <Guide onClose={closeGuide} />}
    </div>
  );
}
