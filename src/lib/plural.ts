import type { Lang } from '../types/events';

/**
 * Serbian numeral agreement: the form follows the last digit, except that the teens (11–14)
 * always take the genitive plural — 1 epizoda, 2–4 epizode, 5+ epizoda, but 11–14 epizoda.
 *
 * The same rule as scripts/lib/serbian.mjs, which writes the landing page; a parity test keeps
 * the two in step (scripts/lib/plural-parity.test.mjs).
 */
export function agreeSr(n: number, [one, few, many]: readonly [string, string, string] | string[]): string {
  const last2 = n % 100;
  const last1 = n % 10;
  if (last2 >= 11 && last2 <= 14) return many;
  if (last1 === 1) return one;
  if (last1 >= 2 && last1 <= 4) return few;
  return many;
}

/**
 * "178 epizoda", "22 epizode" / "1 episode", "2 episodes".
 *
 * HANDOFF §20 writes the count as a fixed "{n} epizoda", which is wrong Serbian for 2–4
 * (and 22–24, …): "22 epizoda". Agreement wins over the handoff's literal string.
 */
export function episodeCount(n: number, lang: Lang): string {
  return `${n} ${episodeNoun(n, lang)}`;
}

/** The noun alone, agreeing with `n` — for "12 / 178 epizoda", where it follows the total. */
export function episodeNoun(n: number, lang: Lang): string {
  if (lang === 'en') return n === 1 ? 'episode' : 'episodes';
  return agreeSr(n, ['epizoda', 'epizode', 'epizoda']);
}
