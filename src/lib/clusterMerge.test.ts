import { describe, expect, it } from 'vitest';
import { mergeOverlapping } from './clusterMerge';
import { clusterSize } from './episodeMarkers';

const group = (x: number, y: number, n: number, tag = 'g') => ({ x, y, items: Array.from({ length: n }, (_, i) => `${tag}${i}`) });

describe('mergeOverlapping', () => {
  it('merges a small cluster that sits on a big one, at the weighted centre', () => {
    // 35 → 50 px, 2 → 29 px; 20 px apart overlaps by 19.5 px, more than a third of 29.
    const [m, ...rest] = mergeOverlapping([group(100, 100, 35, 'b'), group(120, 100, 2, 's')], clusterSize);
    expect(rest).toHaveLength(0);
    expect(m.items).toHaveLength(37);
    expect(m.items[0]).toBe('b0');
    expect(m.x).toBeCloseTo((100 * 35 + 120 * 2) / 37);
  });

  it('leaves clusters that only touch or barely overlap', () => {
    // 29 + 29 px, 50 px apart: 8 px of overlap is under a third of 29.
    expect(mergeOverlapping([group(0, 0, 2), group(50, 0, 2)], clusterSize)).toHaveLength(2);
    expect(mergeOverlapping([group(0, 0, 2), group(200, 0, 2)], clusterSize)).toHaveLength(2);
  });

  it('keeps merging until nothing overlaps, so a chain collapses into one', () => {
    const merged = mergeOverlapping([group(0, 0, 4, 'a'), group(18, 0, 4, 'b'), group(30, 0, 4, 'c')], clusterSize);
    expect(merged).toHaveLength(1);
    expect(merged[0].items).toHaveLength(12);
  });

  it('does not touch its input', () => {
    const input = [group(100, 100, 35), group(120, 100, 2)];
    mergeOverlapping(input, clusterSize);
    expect(input[0].items).toHaveLength(35);
    expect(input).toHaveLength(2);
  });
});
