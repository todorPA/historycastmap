/**
 * Diacritic-insensitive text for search (HANDOFF §5): lowercase, đ → dj, then NFD with the
 * combining marks stripped. đ goes first and by hand because it is a letter with a stroke,
 * not a base letter plus a mark, so NFD cannot decompose it — the same rule as the slugs
 * (scripts/lib/episode-titles.mjs).
 */
export function fold(text: string): string {
  return foldWithMap(text).folded;
}

/** The folded text plus, for each folded character, the index it came from in the original. */
function foldWithMap(text: string): { folded: string; origin: number[] } {
  let folded = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const lower = text[i].toLowerCase();
    const piece = lower === 'đ' ? 'dj' : lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const ch of piece) {
      folded += ch;
      origin.push(i);
    }
  }
  return { folded, origin };
}

/**
 * Where `query` occurs in `text`, ignoring case and diacritics, as [start, end) indices into
 * the ORIGINAL text — ready for highlighting. null when absent or when the query is empty.
 */
export function findFolded(text: string, query: string): [number, number] | null {
  const q = fold(query.trim());
  if (!q) return null;
  const { folded, origin } = foldWithMap(text);
  const at = folded.indexOf(q);
  if (at < 0) return null;
  return [origin[at], origin[at + q.length - 1] + 1];
}
