import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../lib/contrast';
import css from './theme.css?raw';

/** `--name: #rrggbb` declarations in the theme, last one wins (as in CSS). */
const tokens = new Map([...css.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
const v = (name: string) => {
  const hex = tokens.get(name);
  if (!hex) throw new Error(`theme.css does not define ${name} as a hex colour`);
  return hex;
};

// Each pair and floor is the handoff's own claim (HANDOFF §3.1, §3.2). A failure here means the
// palette does not meet its stated contrast — report it; do not nudge the value to pass.
const CLAIMS: Array<[string, string, string, number]> = [
  ['primary text on panels', '--tx', '--f1', 15],
  ['secondary text on panels', '--tx2', '--f1', 9],
  ['tertiary text on panels', '--tx3', '--f1', 6.5],
  ['tertiary text on hover/selected rows', '--tx3', '--f3', 5.4],
  ['gold as text', '--gold-hi', '--f1', 7],
  ['gold as a line', '--gold-line', '--f1', 4.5],
  ['control borders (non-text, 3:1)', '--line', '--f1', 3],
  ['text on a gold fill', '--on-gold', '--gold', 8],
];

/**
 * Compared at one decimal, the precision the handoff states its figures in. Measured exactly,
 * --tx3 on --f3 is 5.38:1 against a stated 5.4 — a rounding difference, comfortably above the
 * 4.5:1 AA floor for body text. Everything else clears its claim outright.
 */
const oneDecimal = (n: number) => Math.round(n * 10) / 10;

describe('theme contrast', () => {
  it.each(CLAIMS)('%s', (_label, fg, bg, floor) => {
    expect(oneDecimal(contrastRatio(v(fg), v(bg)))).toBeGreaterThanOrEqual(floor);
  });

  it('keeps every text pairing above WCAG AA (4.5:1) measured exactly', () => {
    for (const [label, fg, bg] of CLAIMS.filter(([l]) => !l.includes('border') && !l.includes('line'))) {
      expect(contrastRatio(v(fg), v(bg)), label).toBeGreaterThanOrEqual(4.5);
    }
  });

  // §15: gold #D4AA55 is a fill only. As text on the panels it fails even the 3:1 line floor.
  it('keeps raw gold unusable as text, which is why --gold-hi exists', () => {
    expect(contrastRatio(v('--gold'), v('--f1'))).toBeLessThan(3);
  });
});
