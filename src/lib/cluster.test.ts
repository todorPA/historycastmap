import { describe, expect, it } from 'vitest';
import { clusterClickZoom } from './cluster';

describe('clusterClickZoom', () => {
  // The bug: a fixed maxZoom of 7 meant that once the map was at 7 or closer, clicking a
  // cluster re-centred the map and did nothing else. Every Serbian cluster at z7 needs z10–12
  // to separate.
  it('always zooms in when the cluster needs it, however close the map already is', () => {
    expect(clusterClickZoom(7, 10, 18)).toBe(10);
    expect(clusterClickZoom(9, 12, 18)).toBeGreaterThan(9);
  });

  // What the old cap was for: one click from the world view must not land on blank ice.
  it('jumps at most three levels per click', () => {
    expect(clusterClickZoom(2, 12, 18)).toBe(5);
    expect(clusterClickZoom(7, 12, 18)).toBe(10);
  });

  it('still zooms in by one when the members already fit the view', () => {
    expect(clusterClickZoom(7, 7, 18)).toBe(8);
    expect(clusterClickZoom(7, 6, 18)).toBe(8);
  });

  it('never passes the map’s own maximum', () => {
    expect(clusterClickZoom(17, 20, 18)).toBe(18);
    expect(clusterClickZoom(18, 18, 18)).toBe(18);
  });
});
