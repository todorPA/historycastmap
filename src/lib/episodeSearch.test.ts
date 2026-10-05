import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { indexById } from '../types/events';
import { deriveEpisodes } from './episodeModel';
import { matchesQuery, searchEpisode } from './episodeSearch';

import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data);
const places = indexById(data.places);
const find = (q: string) => episodes.filter((e) => matchesQuery(e, q, places, 'sr'));
const byId = (id: string) => episodes.find((e) => e.id === id)!;

describe('searchEpisode', () => {
  it('matches everything for an empty query', () => {
    expect(find('  ')).toHaveLength(episodes.length);
  });

  it('matches the title, without a match line', () => {
    const hit = searchEpisode(byId('43'), 'lazar', places, 'sr');
    expect(hit?.field).toBe('title');
  });

  it('matches a chapter title and says which one', () => {
    // Episode 43's chapters: Lazar's birth, Uroš's death, and his first surviving charter.
    const hit = searchEpisode(byId('43'), 'povelja', places, 'sr');
    expect(hit?.field).toBe('event');
    expect(hit?.text).toBe('Prva sačuvana povelja knjeza Lazara');
    expect(hit?.year).toBe(1375);
  });

  it('matches people, ignoring diacritics', () => {
    expect(find('dusan').length).toBeGreaterThan(0);
    expect(find('Dušan')).toEqual(find('dusan'));
  });

  // Both only reachable through these fields: neither word is in any title in episode 43.
  it('matches a person and names the field', () => {
    const hit = searchEpisode(byId('43'), 'lavra', places, 'sr');
    expect(hit).toMatchObject({ field: 'actor', text: 'Lavra Svetog Atanasija' });
  });

  it('matches a place and names the field', () => {
    const hit = searchEpisode(byId('43'), 'prilepac', places, 'sr');
    expect(hit?.field).toBe('place');
  });

  it('treats 2–4 digits as a year inside the period', () => {
    const in1389 = find('1389');
    expect(in1389.length).toBeGreaterThan(0);
    for (const e of in1389) {
      const hit = searchEpisode(e, '1389', places, 'sr')!;
      if (hit.field === 'year') expect(e.from <= 1389 && 1389 <= e.to).toBe(true);
    }
  });

  it('also matches an episode number', () => {
    expect(searchEpisode(byId('144'), '144', places, 'sr')?.field).toBe('number');
  });

  it('returns null when nothing matches', () => {
    expect(searchEpisode(byId('43'), 'qwxz', places, 'sr')).toBeNull();
  });
});
