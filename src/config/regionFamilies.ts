import type { LocalizedText } from '../types/events';

export interface RegionFamily {
  id: string;
  name: LocalizedText;
  /** Data regions (the closed set in config/regions.ts) that fall in this row. */
  regions: string[];
}

/**
 * The timeline's six rows, and the grouping of region chips in the filter panel (HANDOFF §12.3,
 * §6.3). Twelve rows was too many to read; these keep geographic neighbours together.
 * Order is the display order, top to bottom.
 */
export const REGION_FAMILIES: RegionFamily[] = [
  { id: 'balkan', name: { sr: 'Balkan', en: 'Balkans' }, regions: ['Balkan'] },
  {
    id: 'zapadna-evropa',
    name: { sr: 'Zapadna Evropa', en: 'Western Europe' },
    regions: ['Zapadna Evropa', 'Severna Evropa i Atlantik'],
  },
  {
    id: 'srednja-istocna',
    name: { sr: 'Srednja i Istočna Evropa', en: 'Central & Eastern Europe' },
    regions: ['Srednja Evropa', 'Istočna Evropa'],
  },
  {
    id: 'mediteran',
    name: { sr: 'Mediteran i Bliski istok', en: 'Mediterranean & Near East' },
    regions: ['Vizantija i Egejski svet', 'Osmansko carstvo', 'Bliski istok', 'Afrika'],
  },
  { id: 'azija', name: { sr: 'Azija', en: 'Asia' }, regions: ['Azija'] },
  { id: 'amerike', name: { sr: 'Amerike', en: 'Americas' }, regions: ['Severna Amerika', 'Južna Amerika'] },
];

const BY_REGION = new Map(REGION_FAMILIES.flatMap((f) => f.regions.map((r) => [r, f] as const)));

export function familyOf(region: string | undefined): RegionFamily | undefined {
  return region ? BY_REGION.get(region) : undefined;
}
