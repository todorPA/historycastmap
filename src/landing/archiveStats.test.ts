import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { archiveStats, FIRST_CENTURY, LAST_CENTURY } from './archiveStats';
import shipped from '../../public/data/geo-events.json';

const stats = archiveStats(shipped as unknown as GeoData);
const at = (rows: typeof stats.episodesByCentury, c: number) => rows.find((r) => r.century === c)?.byEra;

describe('archiveStats over the shipped dataset', () => {
  // The design (docs/design/landing/design.html) was drawn from the same data; these are its numbers.
  it('counts episodes, chapters and the places that have a chapter', () => {
    expect(stats).toMatchObject({ episodes: 178, chapters: 742, places: 279 });
  });

  it('puts every episode and every chapter in exactly one century', () => {
    const sum = (rows: typeof stats.episodesByCentury) => rows.reduce((s, r) => s + Object.values(r.byEra).reduce((a, b) => a + (b ?? 0), 0), 0);
    expect(sum(stats.episodesByCentury)).toBe(178);
    expect(sum(stats.chaptersByCentury)).toBe(742);
  });

  it('covers 1200 BC to the 21st century, empty centuries included', () => {
    expect(stats.episodesByCentury[0].century).toBe(FIRST_CENTURY);
    expect(stats.episodesByCentury[stats.episodesByCentury.length - 1].century).toBe(LAST_CENTURY);
    expect(stats.episodesByCentury).toHaveLength(33);
  });

  // Not the design's numbers: its chart filed an episode under the century it *starts* in, in that
  // year's era, so four episodes the map colours Middle Ages showed as Antiquity in the 300s and
  // 400s. Here an episode sits where the app puts it — its anchor, in its era — so the chart's
  // colours are the map's and the list's.
  it('files episodes by their anchor century, in their era', () => {
    expect(at(stats.episodesByCentury, -500)).toEqual({ antika: 2 });
    expect(at(stats.episodesByCentury, 1400)).toEqual({ 'srednji-vek': 3, 'rani-novi-vek': 5 });
    expect(at(stats.episodesByCentury, 1800)).toEqual({ 'dugi-19': 36 });
    expect(at(stats.episodesByCentury, 300)).toEqual({});
  });

  it('matches the design: chapters by year', () => {
    expect(at(stats.chaptersByCentury, -1200)).toEqual({ antika: 1 });
    expect(at(stats.chaptersByCentury, 1300)).toEqual({ 'srednji-vek': 44 });
  });

  it('builds the growth curve by quarter of publication', () => {
    expect(stats.growth.slice(0, 3)).toEqual([
      { year: 2023, quarter: 3, added: 4, total: 4 },
      { year: 2023, quarter: 4, added: 13, total: 17 },
      { year: 2024, quarter: 1, added: 14, total: 31 },
    ]);
    expect(stats.growth[stats.growth.length - 1].total).toBe(178);
  });
});
