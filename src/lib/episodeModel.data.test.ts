import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { deriveEpisodes, timelineExtent } from './episodeModel';
import shipped from '../../public/data/geo-events.json';

// The JSON's inferred types are wider than the schema's unions (confidence is just "string").
// It is the validated dataset, so the cast is the honest description of what it is.
const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data);
const places = new Set(data.places.map((p) => p.id));

describe('episode model on the shipped dataset', () => {
  it('derives one view per episode', () => {
    expect(episodes).toHaveLength(data.episodes.length);
  });

  it('gives every episode a real place, a row, and a sane period', () => {
    for (const e of episodes) {
      expect(places.has(e.placeId), e.id).toBe(true);
      expect(e.family, e.id).toBeDefined();
      expect(Number.isInteger(e.from) && Number.isInteger(e.to) && e.from <= e.to, e.id).toBe(true);
      expect(e.anchor >= e.from && e.anchor <= e.to, e.id).toBe(true);
    }
  });

  /**
   * 540 BC, not the prototype's 550 BC. The difference is one chapter: "Cezar Drugi deo" has
   * four chapters in 48–44 BC and one at 509 BC (the founding of the Republic). §1's trimming
   * rule drops that one as a legacy chapter, as it is meant to, so the earliest episode starts
   * in 499 BC. The prototype shows that episode as 509–44 BC — most likely one of its 36
   * hand-checked overrides. If an override restores it, this becomes -550 again.
   */
  it('opens the timeline at 540 BC – 2050, from the trimmed periods', () => {
    expect(timelineExtent(episodes)).toEqual({ from: -540, to: 2050 });
  });

  it('trims the legacy chapter from Cezar Drugi deo', () => {
    const cezar = episodes.find((e) => e.id === '40')!;
    expect([cezar.from, cezar.to]).toEqual([-48, -44]);
    expect(cezar.events.some((e) => e.year === -509)).toBe(true); // still a chapter
  });
});
