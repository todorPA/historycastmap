/**
 * Marker colour comes from the event's region, not its episode.
 *
 * Episodes can't carry colour: the dataset has 55 of them on the way to 181, and the palette
 * that shipped with the data reuses 9 hues — six episodes to a colour already, twenty by the
 * end. A legend built on that says things that aren't true, and a cluster tinted by its
 * dominant episode hides that it's mixed. Regions are a closed set of 12 (enforced in
 * scripts/validate-data.mjs), which is a palette the eye can actually tell apart, and they're
 * geographically coherent, so a cluster's colour means something: "seven events in the
 * Balkans" is information.
 *
 * Episode stays the filter — see FilterContext. `episodes[].color` is left untouched in the
 * data so this can be revisited (docs/design/DESIGN-BRIEF.md).
 */
/**
 * Twelve hues, solved rather than picked.
 *
 * The previous set was the Flat UI 2013 palette. Its real problem wasn't age: measured as
 * CIELAB ΔE after simulating dichromacy, its closest pair (Zapadna Evropa #d35400 against
 * Bliski istok #b7791f) collapsed to ΔE 2.9 under deuteranopia and 3.6 under tritanopia.
 * Two regions the map claims to distinguish were, for those viewers, one colour.
 *
 * This set was optimised directly against that failure: one hue per 30-degree band so the
 * circle stays complete and region colour keeps its intuition (Balkan warm, Azija violet),
 * with lightness and chroma searched within each band to maximise the worst-case pair
 * distance across normal, deuteranope, protanope and tritanope vision simultaneously.
 *
 *   worst pair, normal        21.4  (was 16.3)
 *   worst pair, deuteranopia  12.9  (was  2.9)
 *   worst pair, protanopia    12.1  (was  8.4)
 *   worst pair, tritanopia    10.3  (was  3.6)
 *
 * Three hues (Zapadna Evropa, Bliski istok, Južna Amerika) were later nudged in lightness
 * so that a label placed on the fill clears 4.5:1 with either ink or white (see onColor
 * below); the timeline draws event titles directly on these colours. That cost 0.36 of
 * worst-case separation and was re-verified against all four vision models.
 *
 * Fills are not gated on contrast against the basemap: markers and legend swatches carry a
 * --marker-ring outline, which buys legibility on both the light tiles and the dark chrome
 * and leaves the hues free to be chosen for distinguishability. Changing a value here
 * without re-running that optimisation will quietly reintroduce a collision.
 */
export const REGION_COLORS: Record<string, string> = {
  Balkan: '#aa2e4e',
  'Vizantija i Egejski svet': '#d86727',
  'Osmansko carstvo': '#ea9602',
  'Srednja Evropa': '#a9c641',
  'Zapadna Evropa': '#548200',
  'Istočna Evropa': '#009f68',
  'Severna Evropa i Atlantik': '#00736e',
  'Bliski istok': '#007e9b',
  Afrika: '#50a9ff',
  Azija: '#5552bb',
  'Severna Amerika': '#853f9f',
  'Južna Amerika': '#77065a',
};

/** Events with no region, or a region added to the data before the palette knows about it. */
export const UNKNOWN_REGION_COLOR = '#8b96a1';

export function regionColor(region: string | undefined): string {
  return (region && REGION_COLORS[region]) || UNKNOWN_REGION_COLOR;
}

/**
 * Readable text colour for a label sitting on a region fill.
 *
 * The twelve hues span a wide lightness range by design (the optimisation varies lightness
 * to survive dichromacy), so a single hardcoded label colour cannot work on all of them.
 * White on Srednja Evropa (#a9c641) is about 1.9:1; ink on Azija (#5552bb) is about 2.2:1.
 * Picking per fill is the only way both stay legible.
 *
 * Relative luminance per WCAG, then the higher-contrast of ink or white.
 */
export function onColor(fill: string): string {
  const hex = fill.replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  // Contrast against ink (#1a1713, L ~= 0.0094) vs against white.
  const vsInk = (L + 0.05) / (0.0094 + 0.05);
  const vsWhite = 1.05 / (L + 0.05);
  return vsInk >= vsWhite ? '#1a1713' : '#ffffff';
}
