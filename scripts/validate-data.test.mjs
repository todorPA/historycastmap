import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = new URL('./validate-data.mjs', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'hcm-validate-'));

/** Runs the validator and reports its exit code and output, without throwing on failure. */
function validate(data, ...flags) {
  const file = join(dir, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(file, JSON.stringify(data));
  try {
    const out = execFileSync('node', [script, file, ...flags], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout}${e.stderr}` };
  }
}

/** Smallest dataset that is valid in strict mode; each test breaks one thing. */
function minimal() {
  return {
    meta: { source: 'test', generated: '2026-01-01T00:00:00Z', count: 1 },
    places: [{ id: 'beograd', name: { sr: 'Beograd', en: 'Belgrade' }, lat: 44.8, lng: 20.5, kind: 'city' }],
    episodes: [{ id: '1', title: { sr: 'Test' }, audioUrl: 'https://example.com/1.mp3', series: 'main' }],
    events: [
      {
        id: 'e1',
        title: { sr: 'Događaj' },
        year: 1389,
        placeId: 'beograd',
        episodeId: '1',
        timestamp: '12:34',
        type: 'battle',
        region: 'Balkan',
        description: { sr: 'Opis.' },
        confidence: 'high',
      },
    ],
  };
}

describe('validate-data', () => {
  it('accepts a valid dataset in strict mode', () => {
    expect(validate(minimal(), '--strict').code).toBe(0);
  });

  it('passes on the dataset the app ships', () => {
    const shipped = JSON.parse(readFileSync(new URL('../public/data/geo-events.json', import.meta.url), 'utf8'));
    expect(validate(shipped, '--strict').code).toBe(0);
  });

  // Regions are the timeline's group rows, so the closed set is a hard UI constraint.
  it('rejects a region outside the closed set in strict mode', () => {
    const d = minimal();
    d.events[0].region = 'Atlantida';
    const { code, out } = validate(d, '--strict');
    expect(code).toBe(1);
    expect(out).toContain('Atlantida');
  });

  it('only warns about an off-list region outside strict mode', () => {
    const d = minimal();
    d.events[0].region = 'Atlantida';
    expect(validate(d).code).toBe(0);
  });

  it('rejects an unknown series', () => {
    const d = minimal();
    d.episodes[0].series = 'podcast';
    expect(validate(d).code).toBe(1);
  });

  it('accepts an episode with no series, which reads as main', () => {
    const d = minimal();
    delete d.episodes[0].series;
    expect(validate(d, '--strict').code).toBe(0);
  });

  it('rejects a non-integer year', () => {
    const d = minimal();
    d.events[0].year = 1389.5;
    expect(validate(d).code).toBe(1);
  });

  it('rejects a span that ends before it starts', () => {
    const d = minimal();
    d.events[0].yearEnd = 1300;
    expect(validate(d).code).toBe(1);
  });

  it('rejects an event pointing at a place that does not exist', () => {
    const d = minimal();
    d.events[0].placeId = 'atlantida';
    expect(validate(d).code).toBe(1);
  });

  it('rejects a malformed timestamp', () => {
    const d = minimal();
    d.events[0].timestamp = '12m34s';
    expect(validate(d).code).toBe(1);
  });

  it('rejects an episode with no audio URL', () => {
    const d = minimal();
    d.episodes[0].audioUrl = '';
    expect(validate(d).code).toBe(1);
  });
});
