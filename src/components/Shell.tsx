import { useEffect } from 'react';
import { useFilters } from '../state/FilterContext';
import { useLayout } from '../state/LayoutContext';
import Sidebar from './Sidebar';
import MapView from './MapView';
import Timeline from './timeline/Timeline';

/**
 * The explorer's frame (HANDOFF §2, §19): panel, map, timeline. Layout state lives in classes on
 * `.app`, so the panel's collapse and the phone sheets are CSS transitions, not remounts.
 */
export default function Shell() {
  const { phone, panelOpen, sheetOpen, setSheetOpen } = useLayout();
  const { selectedEpisodeId } = useFilters();

  // Phone: picking an episode from the sheet closes it, so the card and map are what you see.
  useEffect(() => {
    if (phone && selectedEpisodeId) setSheetOpen(false);
  }, [phone, selectedEpisodeId, setSheetOpen]);

  const classes = ['app', phone ? 'is-phone' : !panelOpen && 'is-panel-closed', phone && sheetOpen && 'is-sheet-open']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <Sidebar />
      <main className="app__main">
        <MapView />
        <Timeline />
      </main>
    </div>
  );
}
