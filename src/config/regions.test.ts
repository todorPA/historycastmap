import { describe, expect, it } from 'vitest';
import { contrastRatio as contrast } from '../lib/contrast';
import { REGION_COLORS, REGION_EN, onColor, regionColor, regionLabel, UNKNOWN_REGION_COLOR } from './regions';

const REGIONS = Object.keys(REGION_COLORS);

describe('regions', () => {
  it('is the closed set of twelve', () => {
    expect(REGIONS).toHaveLength(12);
  });

  // Nothing in the type system ties the two maps together, so this is what does.
  it('has an English name for every region, and none for a region that does not exist', () => {
    expect(Object.keys(REGION_EN).sort()).toEqual([...REGIONS].sort());
  });

  it('shows the Serbian name in sr and the English one in en', () => {
    expect(regionLabel('Južna Amerika', 'sr')).toBe('Južna Amerika');
    expect(regionLabel('Južna Amerika', 'en')).toBe('South America');
  });

  it('falls back to the data’s own string for a region it does not know', () => {
    expect(regionLabel('Atlantida', 'en')).toBe('Atlantida');
    expect(regionColor('Atlantida')).toBe(UNKNOWN_REGION_COLOR);
  });

  // The timeline draws event titles directly on these fills.
  it('keeps a label on every region fill at 4.5:1 or better', () => {
    for (const region of REGIONS) {
      const fill = REGION_COLORS[region];
      expect(contrast(fill, onColor(fill)), region).toBeGreaterThanOrEqual(4.5);
    }
  });
});
