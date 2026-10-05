import type { LocalizedText } from '../types/events';

export type EraId = 'antika' | 'srednji-vek' | 'rani-novi-vek' | 'dugi-19' | 'xx';

export interface Era {
  id: EraId;
  name: LocalizedText;
  /** Inclusive start year. */
  from: number;
  /** Exclusive end year. */
  to: number;
  color: string;
}

/**
 * Colour is by era of the episode's anchor year, and it is the primary encoding on every view
 * (HANDOFF §14). Every mark drawn in these colours carries the ink ring (--ring): that ring is
 * what keeps the ochre era above 3:1 edge contrast on the cream surfaces.
 *
 * Known limitation, accepted 2026-10-05: under deuteranopia "Rani novi vek" and "20. vek" are
 * ΔE 3.4 apart (Machado 2009 simulation, CIELAB) — effectively one colour. A marker alone
 * cannot tell them apart for those readers; the list's era grouping and the timeline position
 * can. Changing a hex here should re-run that check.
 */
export const ERAS: Era[] = [
  { id: 'antika', name: { sr: 'Antika', en: 'Antiquity' }, from: -Infinity, to: 600, color: '#8A6A9E' },
  { id: 'srednji-vek', name: { sr: 'Srednji vek', en: 'Middle Ages' }, from: 600, to: 1453, color: '#3F7F8C' },
  { id: 'rani-novi-vek', name: { sr: 'Rani novi vek', en: 'Early modern' }, from: 1453, to: 1789, color: '#6E8B3D' },
  { id: 'dugi-19', name: { sr: 'Dugi 19. vek', en: 'Long 19th century' }, from: 1789, to: 1914, color: '#C08A2E' },
  { id: 'xx', name: { sr: '20. vek i posle', en: '20th century on' }, from: 1914, to: Infinity, color: '#B4553A' },
];

export function eraOf(year: number): Era {
  return ERAS.find((e) => year >= e.from && year < e.to) ?? ERAS[ERAS.length - 1];
}
