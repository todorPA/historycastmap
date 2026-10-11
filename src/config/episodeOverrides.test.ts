import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { deriveEpisodes, timelineExtent } from '../lib/episodeModel';
import { EPISODE_OVERRIDES } from './episodeOverrides';
import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodeIds = new Set(data.episodes.map((e) => e.id));
const placeIds = new Set(data.places.map((p) => p.id));
const entries = Object.entries(EPISODE_OVERRIDES);

describe('episode overrides', () => {
  // Hand-authored against a dataset produced upstream: an id that drifts must fail loudly, not
  // silently stop applying — the same reasoning as validateCollections.
  it('only name episodes that exist', () => {
    expect(entries.map(([id]) => id).filter((id) => !episodeIds.has(id))).toEqual([]);
  });

  it('only point markers at places that exist', () => {
    expect(entries.filter(([, o]) => o.placeId && !placeIds.has(o.placeId)).map(([id]) => id)).toEqual([]);
  });

  it('give sane periods and known kinds', () => {
    for (const [id, o] of entries) {
      if (o.from !== undefined || o.to !== undefined) {
        expect(Number.isInteger(o.from) && Number.isInteger(o.to), id).toBe(true);
        expect(o.from! <= o.to!, id).toBe(true);
      }
      if (o.kind) expect(['point', 'range', 'long'], id).toContain(o.kind);
    }
  });

  it('carry both languages in every date label', () => {
    for (const [id, o] of entries) if (o.dateLabel) expect(o.dateLabel.sr && o.dateLabel.en, id).toBeTruthy();
  });

  // With the overrides, "Cezar Drugi deo" spans 509–44 BC again, so the timeline opens where the
  // prototype's does (Phase 1 found the difference and traced it to this episode).
  it('restore the prototype’s timeline extent', () => {
    expect(timelineExtent(deriveEpisodes(data, EPISODE_OVERRIDES))).toEqual({ from: -550, to: 2050 });
  });

  it('apply to the episodes they name', () => {
    const eps = Object.fromEntries(deriveEpisodes(data, EPISODE_OVERRIDES).map((e) => [e.id, e]));
    expect(eps['95'].dateLabel?.sr).toBe('28. jun 1389.');
    expect(eps['95'].placeId).toBe('kosovo-polje');
    expect(eps['14'].placeId).toBe('kairo');
  });
});
