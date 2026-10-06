import { describe, expect, it } from 'vitest';
import { INITIAL_AUDIO, audioReducer } from './audioState';

describe('audioReducer', () => {
  it('goes from idle to loading on play, remembering what and from where', () => {
    const s = audioReducer(INITIAL_AUDIO, { type: 'play', seconds: 2278, label: 'Bitka kod Munde' });
    expect(s).toMatchObject({ status: 'loading', from: 2278, label: 'Bitka kod Munde', time: 2278 });
  });

  it('is playing once the media plays, and tracks time and duration', () => {
    let s = audioReducer(INITIAL_AUDIO, { type: 'play', seconds: 0, label: 'x' });
    s = audioReducer(s, { type: 'playing' });
    s = audioReducer(s, { type: 'time', time: 61, duration: 3600 });
    expect(s).toMatchObject({ status: 'playing', time: 61, duration: 3600 });
  });

  it('pauses and resumes', () => {
    let s = audioReducer(audioReducer(INITIAL_AUDIO, { type: 'play', seconds: 0, label: 'x' }), { type: 'playing' });
    s = audioReducer(s, { type: 'pause' });
    expect(s.status).toBe('paused');
    expect(audioReducer(s, { type: 'playing' }).status).toBe('playing');
  });

  // The fallback link must start where the failed play was meant to.
  it('keeps the requested position when it fails, for the mp3 link', () => {
    let s = audioReducer(INITIAL_AUDIO, { type: 'play', seconds: 4000, label: 'x' });
    s = audioReducer(s, { type: 'error' });
    expect(s).toMatchObject({ status: 'error', from: 4000 });
  });

  it('ignores stray media events while idle', () => {
    expect(audioReducer(INITIAL_AUDIO, { type: 'playing' })).toBe(INITIAL_AUDIO);
    expect(audioReducer(INITIAL_AUDIO, { type: 'time', time: 5, duration: 10 })).toBe(INITIAL_AUDIO);
  });

  it('resets when the episode changes', () => {
    const s = audioReducer(audioReducer(INITIAL_AUDIO, { type: 'play', seconds: 9, label: 'x' }), { type: 'playing' });
    expect(audioReducer(s, { type: 'reset' })).toEqual(INITIAL_AUDIO);
  });
});
