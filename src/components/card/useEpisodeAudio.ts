import { useCallback, useEffect, useReducer, useRef } from 'react';
import { INITIAL_AUDIO, audioReducer } from './audioState';

/**
 * One `<audio>` element for the card, driven by audioReducer (audioState.ts).
 *
 * `#t=` in the src is not enough on its own: some browsers ignore it, so the seek is also done
 * explicitly once metadata is in. A play() rejection — autoplay policy, or a file that never
 * arrives — must end the loading state, or the button would claim to be loading forever.
 */
export function useEpisodeAudio(audioUrl: string) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [state, dispatch] = useReducer(audioReducer, INITIAL_AUDIO);

  // A different episode is a different file: stop and forget the old one.
  useEffect(() => {
    dispatch({ type: 'reset' });
    const el = ref.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }, [audioUrl]);

  const play = useCallback(
    (seconds: number, label: string) => {
      const el = ref.current;
      if (!el || !audioUrl) return;
      dispatch({ type: 'play', seconds, label });
      const start = () => {
        if (Number.isFinite(el.duration) && seconds < el.duration) el.currentTime = seconds;
        void el.play().catch(() => dispatch({ type: 'error' }));
      };
      if (el.getAttribute('src') !== audioUrl) {
        el.src = audioUrl;
        el.addEventListener('loadedmetadata', start, { once: true });
        el.load();
      } else if (el.readyState >= 1) start();
      else el.addEventListener('loadedmetadata', start, { once: true });
    },
    [audioUrl],
  );

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => dispatch({ type: 'error' }));
    else el.pause();
  }, []);

  /** Props for the <audio> element; render it once, hidden — the card draws its own player. */
  const audioProps = {
    ref,
    preload: 'none' as const,
    onPlaying: () => dispatch({ type: 'playing' }),
    onPause: () => dispatch({ type: 'pause' }),
    onTimeUpdate: () => {
      const el = ref.current;
      if (el) dispatch({ type: 'time', time: el.currentTime, duration: el.duration || 0 });
    },
    onError: () => dispatch({ type: 'error' }),
  };

  return { state, play, toggle, audioProps };
}
