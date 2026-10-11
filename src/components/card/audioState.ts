/**
 * The card's player (HANDOFF §10.2). One `<audio>` per card; this is its state, kept as a pure
 * reducer so the transitions are testable without a browser.
 *
 * `loading` exists because episodes are hour-long mp3s on a third-party host: between pressing
 * play and hearing anything there is a fetch and a seek that can be an hour in. Without a state
 * for that wait the button looked broken and people pressed it again (kept from the old popup).
 */
export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioState {
  status: AudioStatus;
  /** What is playing: the chapter's title, or the episode's for "Slušaj epizodu". */
  label: string;
  /** Where the play was asked to start, in seconds — also the fallback link's `#t=`. */
  from: number;
  time: number;
  duration: number;
}

export type AudioAction =
  | { type: 'play'; seconds: number; label: string }
  | { type: 'playing' }
  | { type: 'pause' }
  /** The file played to its end: `ended` fires, not `pause`. */
  | { type: 'ended' }
  | { type: 'time'; time: number; duration: number }
  | { type: 'error' }
  | { type: 'reset' };

export const INITIAL_AUDIO: AudioState = { status: 'idle', label: '', from: 0, time: 0, duration: 0 };

export function audioReducer(s: AudioState, a: AudioAction): AudioState {
  switch (a.type) {
    case 'play':
      return { status: 'loading', label: a.label, from: a.seconds, time: a.seconds, duration: s.duration };
    case 'reset':
      return INITIAL_AUDIO;
    default:
      // Media events can arrive after a reset (the element finishes a request it had started).
      if (s.status === 'idle') return s;
      if (a.type === 'playing') return { ...s, status: 'playing' };
      if (a.type === 'pause' || a.type === 'ended') return { ...s, status: 'paused' };
      if (a.type === 'time') return { ...s, time: a.time, duration: a.duration };
      return { ...s, status: 'error' };
  }
}
