import { describe, expect, it } from 'vitest';
import { REGION_COLORS } from './regions';
import { REGION_FAMILIES, familyOf } from './regionFamilies';

describe('region families', () => {
  // Every one of the twelve closed-set regions must land in exactly one row, or its episodes
  // would have no timeline row to appear in.
  it('places every data region in exactly one family', () => {
    const all = REGION_FAMILIES.flatMap((f) => f.regions).sort();
    expect(all).toEqual(Object.keys(REGION_COLORS).sort());
  });

  it('follows the handoff mapping (§12.3)', () => {
    expect(familyOf('Severna Evropa i Atlantik')?.id).toBe('zapadna-evropa');
    expect(familyOf('Afrika')?.id).toBe('mediteran');
    expect(familyOf('Južna Amerika')?.id).toBe('amerike');
  });

  it('has an English name for every family', () => {
    for (const f of REGION_FAMILIES) expect(f.name.en, f.id).toBeTruthy();
  });

  it('returns undefined for a region it does not know', () => {
    expect(familyOf('Atlantida')).toBeUndefined();
    expect(familyOf(undefined)).toBeUndefined();
  });
});
