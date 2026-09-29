/**
 * Serbian grammar the generated landing copy depends on.
 *
 * Extracted from build-century-chart.mjs so it can be tested (serbian.test.mjs). The landing
 * page is regenerated from the dataset, and a count that changes silently changes the grammar
 * around it too — "102 epizode" became wrong the moment the archive reached 178. A stale number
 * is visible; wrong grammar in the site's own language is worse, and nothing else catches it.
 */

/**
 * Numeral agreement for the counted noun. The form follows the LAST digit, except that the
 * teens (11–14) always take the genitive plural: 1 epizoda, 2–4 epizode, 5+ epizoda, but
 * 11–14 epizoda.
 *
 * @param {number} n
 * @param {[string, string, string]} forms  [one, few, many], e.g. ['vek', 'veka', 'vekova']
 */
export function agree(n, [one, few, many]) {
  const last2 = n % 100;
  const last1 = n % 10;
  if (last2 >= 11 && last2 <= 14) return many;
  if (last1 === 1) return one;
  if (last1 >= 2 && last1 <= 4) return few;
  return many;
}

/** Spelled out up to twenty, to match the surrounding prose; digits beyond. */
const NUMERALS = [
  'nula', 'jedan', 'dva', 'tri', 'četiri', 'pet', 'šest', 'sedam', 'osam', 'devet', 'deset',
  'jedanaest', 'dvanaest', 'trinaest', 'četrnaest', 'petnaest', 'šesnaest', 'sedamnaest',
  'osamnaest', 'devetnaest', 'dvadeset',
];

export function numberWord(n) {
  return NUMERALS[n] ?? String(n);
}

/**
 * "sedam vekova nema" — the chart caption's count of centuries with no events.
 * Noun and verb both agree with the count: 1 vek nema, 2–4 veka nemaju, 5+ vekova nema.
 *
 * Both go through agree(). This used to test n === 1 and 2 <= n <= 4 directly — right below
 * twenty, wrong past it: 21 came out as "21 vekova nema" and 22 as "22 vekova nema".
 */
export function emptyCenturiesPhrase(n) {
  return `${numberWord(n)} ${agree(n, ['vek', 'veka', 'vekova'])} ${agree(n, ['nema', 'nemaju', 'nema'])}`;
}
