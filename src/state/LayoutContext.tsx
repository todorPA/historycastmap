import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/** The search box's id, so the pill, the phone bar and `/` can focus it. */
export const SEARCH_INPUT_ID = 'hc-search';
/** The panel's open transition (§2: 420 ms), and a little: focus lands once it is in place. */
const OPEN_FOCUS_DELAY_MS = 360;

/** HANDOFF §19: the phone layout applies below 720 px of app width (the app is the viewport). */
const PHONE_QUERY = '(max-width: 719.98px)';

function matchesPhone(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches;
}

export function usePhone(): boolean {
  const [phone, setPhone] = useState(matchesPhone);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

interface LayoutContextValue {
  phone: boolean;
  /** Desktop: the left panel is expanded (§2). Not in the URL — a reading preference, like S/M/L. */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /** The filter panel, lifted out of the sidebar so the guide can close it (§16). */
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  /** Phone: the left panel as a full-screen sheet (§19). */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  /** Phone: the episode card folded to its 118 px peek. */
  cardPeek: boolean;
  setCardPeek: (peek: boolean) => void;
  /** Bring the search box into view — expanding the panel or opening the phone sheet — and focus it. */
  openSearch: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

/** Which parts of the shell are open: panel, filter panel, phone sheets. Nothing here is data. */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const phone = usePhone();
  const [panelOpen, setPanelOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cardPeek, setCardPeek] = useState(false);

  // Leaving the phone layout closes its sheets; the desktop panel was never collapsed by it.
  useEffect(() => {
    if (!phone) {
      setSheetOpen(false);
      setCardPeek(false);
    }
  }, [phone]);

  const openSearch = useCallback(() => {
    const hidden = phone ? !sheetOpen : !panelOpen;
    if (phone) setSheetOpen(true);
    else setPanelOpen(true);
    const focus = () => document.getElementById(SEARCH_INPUT_ID)?.focus();
    if (hidden) window.setTimeout(focus, OPEN_FOCUS_DELAY_MS);
    else focus();
  }, [phone, sheetOpen, panelOpen]);

  const value = useMemo(
    () => ({ phone, panelOpen, setPanelOpen, filtersOpen, setFiltersOpen, sheetOpen, setSheetOpen, cardPeek, setCardPeek, openSearch }),
    [phone, panelOpen, filtersOpen, sheetOpen, cardPeek, openSearch],
  );
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside <LayoutProvider>');
  return ctx;
}
