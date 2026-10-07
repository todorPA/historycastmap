import { afterEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, scrollBehavior } from './motion';

describe('reduced motion', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stub = (matches: boolean) =>
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' && matches }) });

  it('reads the user setting', () => {
    stub(true);
    expect(prefersReducedMotion()).toBe(true);
    stub(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  // A JS call that passes behavior: 'smooth' animates even when the CSS says otherwise.
  it('picks an instant scroll when motion is reduced', () => {
    stub(true);
    expect(scrollBehavior()).toBe('auto');
    stub(false);
    expect(scrollBehavior()).toBe('smooth');
  });

  it('assumes motion is fine where there is no window', () => {
    vi.stubGlobal('window', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
