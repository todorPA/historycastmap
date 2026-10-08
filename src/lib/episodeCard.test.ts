import { describe, expect, it } from 'vitest';
import type { GeoData } from '../types/events';
import { deriveEpisodes, type EpisodeView } from './episodeModel';
import { EPISODE_OVERRIDES } from '../config/episodeOverrides';
import { kindLabel, mmss, neighbours, publishedLabel, sameTime, youtubeSearchUrl } from './episodeCard';
import { chronological } from './panelModel';
import shipped from '../../public/data/geo-events.json';

const data = shipped as unknown as GeoData;
const episodes = deriveEpisodes(data, EPISODE_OVERRIDES);
const byId = (id: string) => episodes.find((e) => e.id === id)!;

describe('neighbours (§10.2 Mesto u istoriji, ←/→)', () => {
  const sorted = [...episodes].sort(chronological);
  it('steps to the chronologically previous and next episode', () => {
    const i = 50;
    expect(neighbours(sorted[i], episodes)).toEqual({ prev: sorted[i - 1], next: sorted[i + 1] });
  });
  it('has no previous before the first, nor next after the last', () => {
    expect(neighbours(sorted[0], episodes).prev).toBeNull();
    expect(neighbours(sorted[sorted.length - 1], episodes).next).toBeNull();
  });
  it('only steps among the matching set', () => {
    const subset = [sorted[3], sorted[10], sorted[40]];
    expect(neighbours(sorted[10], subset)).toEqual({ prev: sorted[3], next: sorted[40] });
  });
  it('still answers for a selected episode the filters exclude', () => {
    const subset = [sorted[3], sorted[40]];
    expect(neighbours(sorted[10], subset)).toEqual({ prev: sorted[3], next: sorted[40] });
  });
});

describe('sameTime (§10.2 U isto vreme)', () => {
  const lazar = byId('43'); // 1329–1375, Balkan
  const { shown, more } = sameTime(lazar, episodes);
  const overlaps = (e: EpisodeView) => e.to >= lazar.from && e.from <= lazar.to;

  it('lists only other episodes that overlap the period, at most five', () => {
    expect(shown.length).toBeLessThanOrEqual(5);
    expect(shown.every(overlaps)).toBe(true);
    expect(shown).not.toContain(lazar);
  });

  it('counts the rest it did not show', () => {
    const all = episodes.filter((e) => e !== lazar && overlaps(e)).length;
    expect(shown.length + more).toBe(all);
  });

  it('puts every other-region episode before any same-region one', () => {
    const all = sameTime(lazar, episodes, Infinity).shown;
    const same = (e: EpisodeView) => e.family?.id === lazar.family?.id;
    // The ordering only means something if both kinds overlap Lazar's period — check they do.
    expect(all.some(same) && all.some((e) => !same(e))).toBe(true);
    expect(all.findIndex(same)).toBeGreaterThan(all.map(same).lastIndexOf(false));
  });

  it('orders each group by closeness in time', () => {
    const all = sameTime(lazar, episodes, Infinity).shown.filter((e) => e.family?.id !== lazar.family?.id);
    const gaps = all.map((e) => Math.abs(e.anchor - lazar.anchor));
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
  });
});

describe('publishedLabel', () => {
  it('names the month in each language', () => {
    expect(publishedLabel('Tue, 08 Sep 2026 22:22:29 GMT', 'sr')).toBe('objavljena septembar 2026');
    expect(publishedLabel('Mon, 01 Jul 2024 18:15:31 GMT', 'en')).toBe('published July 2024');
  });
  it('reads the month in UTC, as the feed writes it', () => {
    expect(publishedLabel('Sat, 31 Aug 2024 23:30:00 GMT', 'sr')).toBe('objavljena avgust 2024');
  });
  it('is empty for a missing or unreadable date', () => {
    expect(publishedLabel('', 'sr')).toBe('');
    expect(publishedLabel('soon', 'sr')).toBe('');
  });
});

describe('youtubeSearchUrl', () => {
  it('searches YouTube for the episode, since the data has no video ids', () => {
    const url = new URL(youtubeSearchUrl(byId('43')));
    expect(url.origin + url.pathname).toBe('https://www.youtube.com/results');
    expect(url.searchParams.get('search_query')).toBe('HistoryCast Knez Lazar Hrebeljanović');
  });
});

describe('kindLabel', () => {
  it('names the date type in both languages', () => {
    expect(kindLabel('point', 'sr')).toBe('jedan datum');
    expect(kindLabel('range', 'sr')).toBe('period');
    expect(kindLabel('long', 'sr')).toBe('dug period');
    expect(kindLabel('long', 'en')).toBe('long period');
  });
});

describe('mmss', () => {
  it('writes minutes and seconds, and hours past the hour', () => {
    expect(mmss(0)).toBe('0:00');
    expect(mmss(2278)).toBe('37:58');
    expect(mmss(3725)).toBe('1:02:05');
  });
  it('floors fractions and treats nonsense as zero', () => {
    expect(mmss(61.9)).toBe('1:01');
    expect(mmss(NaN)).toBe('0:00');
    expect(mmss(-5)).toBe('0:00');
  });
});
