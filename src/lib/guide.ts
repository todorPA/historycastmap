/**
 * The first-use guide's geometry and memory (HANDOFF §16). Pure, so placement is testable
 * without a layout engine; the component measures and passes rects in.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const GUIDE_KEY = 'hcm-guide-v1';
export const GUIDE_DELAY_MS = 700;

/** The spotlight hole: the target grown by `pad` on every side. */
export function spotlightRect(target: Rect, pad: number): Rect {
  return { left: target.left - pad, top: target.top - pad, width: target.width + 2 * pad, height: target.height + 2 * pad };
}

export type CardPlacement =
  | { side: 'right'; left: number; top: number; width: number }
  | { side: 'above'; left: number; bottom: number; width: number };

const GAP = 18;
const EDGE = 16;
const STEP1_WIDTH = 360;
const STEP2_WIDTH = 420;

/**
 * Step 1 sits to the right of the filter button, arrow pointing left at it; step 2 sits above the
 * timeline, arrow pointing down, centred on it but kept inside the viewport.
 */
export function cardPlacement(step: 0 | 1, target: Rect, viewport: { width: number; height: number }): CardPlacement {
  if (step === 0) {
    return { side: 'right', left: target.left + target.width + GAP, top: Math.max(12, target.top - GAP), width: STEP1_WIDTH };
  }
  const centred = target.left + target.width / 2 - STEP2_WIDTH / 2;
  const left = Math.min(viewport.width - STEP2_WIDTH - EDGE, Math.max(EDGE, centred));
  return { side: 'above', left, bottom: viewport.height - target.top + GAP, width: STEP2_WIDTH };
}

/** Storage can throw (private mode, blocked cookies): a guide that cannot remember stays quiet. */
export function guideSeen(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): boolean {
  try {
    return storage?.getItem(GUIDE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markGuideSeen(storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(GUIDE_KEY, '1');
  } catch {
    // Nothing to do: it will simply show again next time.
  }
}
