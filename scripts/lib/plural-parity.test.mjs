// The landing page's generated copy (scripts/lib/serbian.mjs) and the app (src/lib/plural.ts)
// each carry the Serbian agreement rule. They live in different worlds — a Node build script and
// a browser bundle — so this test is what keeps them from drifting apart.
import { describe, expect, it } from 'vitest';
import { agree } from './serbian.mjs';
import { agreeSr } from '../../src/lib/plural.ts';

describe('Serbian agreement, script vs app', () => {
  it('agrees for every count from 0 to 300', () => {
    const forms = ['one', 'few', 'many'];
    for (let n = 0; n <= 300; n++) expect(agreeSr(n, forms), String(n)).toBe(agree(n, forms));
  });
});
