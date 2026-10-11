/**
 * Fills every empty `data-i="key"` element in the landing page's HTML with that key's string.
 * Run at build time with the Serbian set (vite.config.ts), so the page reads without JavaScript;
 * the page script later swaps languages through the same keys. Only *empty* elements are filled,
 * so the markup holds no copy of the text to drift from strings.ts.
 */
const EMPTY_I18N = /(<(\w+)\b[^>]*?\sdata-i="(\w+)"[^>]*>)(<\/\2>)/g;

export function fillStrings(html: string, strings: Record<string, string>): { html: string; missing: string[] } {
  const missing: string[] = [];
  const out = html.replace(EMPTY_I18N, (all, open: string, _tag: string, key: string, close: string) => {
    const text = strings[key];
    if (text === undefined) {
      missing.push(key);
      return all;
    }
    return open + text + close;
  });
  return { html: out, missing };
}
