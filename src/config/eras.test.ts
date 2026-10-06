import { describe, expect, it } from 'vitest';
import { ERAS, eraOf } from './eras';

describe('eras', () => {
  it('uses the handoff colours exactly (§14)', () => {
    expect(ERAS.map((e) => e.color)).toEqual(['#8A6A9E', '#3F7F8C', '#6E8B3D', '#C08A2E', '#B4553A']);
  });

  it('starts each era on its boundary year, inclusive', () => {
    expect(eraOf(599).id).toBe('antika');
    expect(eraOf(600).id).toBe('srednji-vek');
    expect(eraOf(1452).id).toBe('srednji-vek');
    expect(eraOf(1453).id).toBe('rani-novi-vek');
    expect(eraOf(1789).id).toBe('dugi-19');
    expect(eraOf(1913).id).toBe('dugi-19');
    expect(eraOf(1914).id).toBe('xx');
  });

  it('covers every year, BC and far future', () => {
    expect(eraOf(-3000).id).toBe('antika');
    expect(eraOf(2500).id).toBe('xx');
  });
});
