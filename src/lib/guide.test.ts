import { describe, expect, it } from 'vitest';
import { cardPlacement, guideSeen, markGuideSeen, spotlightRect } from './guide';

describe('spotlightRect', () => {
  it('grows the target by the padding on every side', () => {
    expect(spotlightRect({ left: 100, top: 50, width: 40, height: 40 }, 6)).toEqual({ left: 94, top: 44, width: 52, height: 52 });
  });
});

describe('cardPlacement', () => {
  const vp = { width: 1400, height: 900 };

  it('puts step 1 to the right of the filter button', () => {
    expect(cardPlacement(0, { left: 280, top: 180, width: 40, height: 40 }, vp)).toEqual({ side: 'right', left: 338, top: 162, width: 360 });
  });

  it('never lets step 1 climb above 12 px', () => {
    expect(cardPlacement(0, { left: 280, top: 10, width: 40, height: 40 }, vp)).toMatchObject({ top: 12 });
  });

  it('centres step 2 above the timeline', () => {
    expect(cardPlacement(1, { left: 328, top: 500, width: 1072, height: 400 }, vp)).toEqual({ side: 'above', left: 654, bottom: 418, width: 420 });
  });

  it('keeps step 2 16 px inside a narrow viewport', () => {
    expect(cardPlacement(1, { left: 0, top: 500, width: 300, height: 400 }, vp)).toMatchObject({ left: 16 });
    expect(cardPlacement(1, { left: 1300, top: 500, width: 300, height: 400 }, vp)).toMatchObject({ left: 1400 - 420 - 16 });
  });
});

describe('guideSeen / markGuideSeen', () => {
  const memory = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  it('remembers once marked', () => {
    const s = memory();
    expect(guideSeen(s)).toBe(false);
    markGuideSeen(s);
    expect(guideSeen(s)).toBe(true);
  });

  // Blocked storage can throw on the *getter*, before any method is called: resolving the
  // default outside the try would crash the shell's effect.
  it('survives a localStorage getter that throws', () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError'); } });
    try {
      expect(guideSeen()).toBe(true);
      expect(() => markGuideSeen()).not.toThrow();
    } finally {
      if (before) Object.defineProperty(globalThis, 'localStorage', before);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });

  it('treats storage that throws as already seen, and marking as a no-op', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(guideSeen(broken)).toBe(true);
    expect(() => markGuideSeen(broken)).not.toThrow();
  });
});
