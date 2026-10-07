/**
 * WCAG 2.x relative luminance and contrast ratio, for `#rrggbb` colours.
 *
 * One implementation for the label-colour choice on region fills (config/regions.ts onColor)
 * and for the tests that hold the theme to its stated contrast (styles/theme.test.ts).
 */
export function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** From 1 (identical) to 21 (black on white). Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
