import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

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

  const value = useMemo(
    () => ({ phone, panelOpen, setPanelOpen, filtersOpen, setFiltersOpen, sheetOpen, setSheetOpen, cardPeek, setCardPeek }),
    [phone, panelOpen, filtersOpen, sheetOpen, cardPeek],
  );
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used inside <LayoutProvider>');
  return ctx;
}
