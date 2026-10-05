import { describe, expect, it } from 'vitest';
import { REGION_COLORS, REGION_EN, onColor, regionColor, regionLabel, UNKNOWN_REGION_COLOR } from './regions';

const REGIONS = Object.keys(REGION_COLORS);

/** WCAG relative-luminance contrast ratio. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

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
