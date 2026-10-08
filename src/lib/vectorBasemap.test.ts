import { describe, expect, it } from 'vitest';
import { closeupOpacity, decodeLine, isVectorGeometry } from './vectorBasemap';

describe('decodeLine', () => {
  it('turns flat lon×100, lat×100 pairs into Leaflet [lat, lng] points', () => {
    expect(decodeLine([2046, 4482, -1200, -3350])).toEqual([
      [44.82, 20.46],
      [-33.5, -12],
    ]);
  });

  it('reads an empty array as no points', () => {
    expect(decodeLine([])).toEqual([]);
  });
});

describe('isVectorGeometry', () => {
  const ok = { land: [[0, 0, 1, 1]], lakes: [], rivers: [], borders: [] };

  it('accepts the four layers as lists of even-length number arrays', () => {
    expect(isVectorGeometry(ok)).toBe(true);
  });

  it('rejects a missing layer, an odd-length array or a non-object', () => {
    expect(isVectorGeometry({ ...ok, borders: undefined })).toBe(false);
    expect(isVectorGeometry({ ...ok, land: [[0, 0, 1]] })).toBe(false);
    expect(isVectorGeometry(null)).toBe(false);
    expect(isVectorGeometry('land')).toBe(false);
  });
});

describe('closeupOpacity', () => {
  const fade = { from: 6.5, to: 7.5 };

  it('keeps the tiles hidden up to the start of the fade', () => {
    expect(closeupOpacity(5, fade)).toBe(0);
    expect(closeupOpacity(6.5, fade)).toBe(0);
  });

  it('ramps linearly across the fade', () => {
    expect(closeupOpacity(7, fade)).toBeCloseTo(0.5);
    expect(closeupOpacity(6.75, fade)).toBeCloseTo(0.25);
  });

  it('shows the tiles fully from the end of the fade', () => {
    expect(closeupOpacity(7.5, fade)).toBe(1);
    expect(closeupOpacity(12, fade)).toBe(1);
  });
});
