import { describe, expect, it } from 'vitest';
import { nearestOutside } from './emptyPeriod';

const ep = (id: string, from: number, to: number) => ({ id, from, to, anchor: (from + to) / 2 });

describe('nearestOutside', () => {
  const eps = [ep('a', 1000, 1010), ep('b', 1300, 1320), ep('c', 1500, 1500)];

  it('is null when something overlaps the window', () => {
    expect(nearestOutside(eps, { from: 1305, to: 1310 })).toBeNull();
  });

  it('is null when nothing matches', () => {
    expect(nearestOutside([], { from: 0, to: 10 })).toBeNull();
  });

  it('picks the episode with the smallest gap to the window, on either side', () => {
    expect(nearestOutside(eps, { from: 1330, to: 1340 })?.id).toBe('b');
    expect(nearestOutside(eps, { from: 1450, to: 1490 })?.id).toBe('c');
    expect(nearestOutside(eps, { from: 1100, to: 1200 })?.id).toBe('a'); // 90 years before vs 100 after
  });

  it('breaks a tie towards the earlier episode', () => {
    expect(nearestOutside([ep('late', 120, 130), ep('early', 70, 80)], { from: 90, to: 110 })?.id).toBe('early');
  });
});
