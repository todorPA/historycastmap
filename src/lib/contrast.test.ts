import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from './contrast';

describe('contrast (WCAG 2.x)', () => {
  it('gives the reference extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBe(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is symmetric and at least 1', () => {
    expect(contrastRatio('#21170F', '#F7F0E3')).toBeCloseTo(contrastRatio('#F7F0E3', '#21170F'), 10);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('accepts lowercase and shorthand-free hex either way', () => {
    expect(contrastRatio('#d4aa55', '#1b130d')).toBeCloseTo(contrastRatio('#D4AA55', '#1B130D'), 10);
  });
});
