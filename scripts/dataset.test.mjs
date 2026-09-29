/**
 * Integrity of the data as committed — the failures the schema validator cannot see.
 *
 * Every one of these fails silently in production: a fragment named off-by-a-letter still
 * merges, but its episode shows as "Epizoda <id>" with an empty audioUrl, and "Play at MM:SS"
 * quietly does nothing. The validator checks shape; this checks that the pieces join up.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseEpisodeNumber, slugify } from './lib/episode-titles.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

const feed = read('episodes.json');
const data = read('public/data/geo-events.json');
const fragments = readdirSync(new URL('fragments/', root)).filter((f) => f.endsWith('.json'));

describe('fragments', () => {
  const numbers = new Set(feed.map((e) => parseEpisodeNumber(e.title)?.number).filter(Boolean));
  const slugs = new Set(feed.map((e) => slugify(e.title)));

  it('are each named after an episode the feed knows, by number or by slug', () => {
    const orphans = fragments
      .map((f) => f.replace(/\.json$/, ''))
      .filter((id) => !numbers.has(String(Number(id))) && !slugs.has(id));
    expect(orphans).toEqual([]);
  });

  it('carry an episodeId equal to their own file name', () => {
    const mismatched = [];
    for (const f of fragments) {
      const id = f.replace(/\.json$/, '');
      for (const e of read(`fragments/${f}`).events ?? []) {
        if (e.episodeId !== id) mismatched.push(`${f}: ${e.id} has episodeId "${e.episodeId}"`);
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe('merged dataset', () => {
  it('has a real title for every episode, never the "Epizoda <id>" fallback', () => {
    expect(data.episodes.filter((e) => /^Epizoda /.test(e.title.sr)).map((e) => e.id)).toEqual([]);
  });

  it('has an audio URL for every episode, so every "Play" button works', () => {
    expect(data.episodes.filter((e) => !e.audioUrl).map((e) => e.id)).toEqual([]);
  });

  it('only references episodes and places that exist', () => {
    const episodes = new Set(data.episodes.map((e) => e.id));
    const places = new Set(data.places.map((p) => p.id));
    expect(data.events.filter((e) => !episodes.has(e.episodeId)).map((e) => e.id)).toEqual([]);
    expect(data.events.filter((e) => !places.has(e.placeId)).map((e) => e.id)).toEqual([]);
  });

  it('has one episode per fragment', () => {
    expect(data.episodes.length).toBe(fragments.length);
  });
});
