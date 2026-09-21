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
export const REGION_COLORS: Record<string, string> = {
  Balkan: '#c0392b',
  'Vizantija i Egejski svet': '#8e44ad',
  'Osmansko carstvo': '#16a085',
  'Srednja Evropa': '#2980b9',
  'Zapadna Evropa': '#d35400',
  'Istočna Evropa': '#7f8c8d',
  'Severna Evropa i Atlantik': '#1e8449',
  'Bliski istok': '#b7791f',
  Afrika: '#a04000',
  Azija: '#6c3483',
  'Severna Amerika': '#2c3e50',
  'Južna Amerika': '#117864',
};

/** Events with no region, or a region added to the data before the palette knows about it. */
export const UNKNOWN_REGION_COLOR = '#95a5a6';

export function regionColor(region: string | undefined): string {
  return (region && REGION_COLORS[region]) || UNKNOWN_REGION_COLOR;
}
