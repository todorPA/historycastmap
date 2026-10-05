import { describe, expect, it } from 'vitest';
import { BASEMAPS } from '../config/basemaps';
import { spacingFor } from './graticule';

/** Visible longitude span at a zoom level, for a viewport roughly as wide as the map. */
const spanAt = (zoom: number) => 360 / 2 ** (zoom - 1);

describe('spacingFor', () => {
  // The first version used a zoom→spacing table that bottomed out at 0.5°. Past about z12 the
  // span was smaller than the step, and the grid thinned to one line or vanished — exactly
  // where the basemap is blank and the grid is the only sign you are looking at a map.
  // Up to the deepest zoom any basemap allows, not a number picked here — the grid has to
  // hold wherever the reader can actually go.
  const maxZoom = Math.max(...BASEMAPS.map((b) => b.maxZoom ?? 18));

  it('keeps a readable number of divisions at every zoom the map allows', () => {
    for (let zoom = 2; zoom <= maxZoom; zoom++) {
      const span = spanAt(zoom);
      const divisions = span / spacingFor(span);
      expect(divisions, `z${zoom}`).toBeGreaterThanOrEqual(5);
      expect(divisions, `z${zoom}`).toBeLessThanOrEqual(15);
    }
  });

  it('stays on round coordinates', () => {
    expect(spacingFor(180)).toBe(30);
    expect(spacingFor(spanAt(12))).toBe(0.02);
  });
});
