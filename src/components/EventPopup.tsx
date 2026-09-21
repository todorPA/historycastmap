import { useRef, useState } from 'react';
import type { HistoryEvent } from '../types/events';
import { useData } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';
import { formatYearRange } from '../lib/time';
import { buildPodcastLink, timestampToSeconds } from '../lib/podcast';
import { regionColor } from '../config/regions';

export default function EventPopup({ event }: { event: HistoryEvent }) {
  const { placesById, episodesById } = useData();
  const { lang } = useFilters();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  /**
   * Episodes are hour-long mp3s on a third-party host, so the gap between pressing the
   * button and hearing anything is real: fetch, then seek to a timestamp that can be an
   * hour in. Without a state for that wait the button looked broken and people pressed it
   * again.
   */
  const [audio, setAudio] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const place = placesById[event.placeId];
  const episode = episodesById[event.episodeId];
  const seconds = event.timestamp ? timestampToSeconds(event.timestamp) : 0;
  const deepLink = episode && event.timestamp ? buildPodcastLink(episode.audioUrl, event.timestamp) : null;

  const confidenceLabel = t(
    lang,
    event.confidence === 'high'
      ? 'confidenceHigh'
      : event.confidence === 'medium'
        ? 'confidenceMedium'
        : 'confidenceLow',
  );

  /** Inline fallback: some browsers ignore #t=, so seek explicitly once metadata is in. */
  function playInline() {
    setShowPlayer(true);
    setAudio('loading');
    requestAnimationFrame(() => {
      const el = audioRef.current;
      if (!el) {
        setAudio('error');
        return;
      }
      const seek = () => {
        if (Number.isFinite(el.duration) && seconds < el.duration) el.currentTime = seconds;
        // Rejects under autoplay policy, or if the file never arrives. Either way the
        // button must stop claiming it is loading.
        void el.play().catch(() => setAudio('error'));
      };
      if (el.readyState >= 1) seek();
      else el.addEventListener('loadedmetadata', seek, { once: true });
    });
  }

  return (
    <div className="event-popup">
      <h3 className="event-popup__title">{pick(event.title, lang)}</h3>

      <div className="event-popup__meta">
        <span className="event-popup__year">{formatYearRange(event.year, event.yearEnd, lang)}</span>
        {place && <span className="event-popup__place">{pick(place.name, lang)}</span>}
        {event.region && <span className="event-popup__region">{event.region}</span>}
        <span className={`badge badge--${event.confidence}`}>
          {t(lang, 'confidence')}: {confidenceLabel}
        </span>
      </div>

      {event.actors && event.actors.length > 0 && (
        <ul className="chips">
          {event.actors.map((actor) => (
            <li key={actor} className="chip">
              {actor}
            </li>
          ))}
        </ul>
      )}

      <p className="event-popup__desc">{pick(event.description, lang)}</p>

      {event.quote && <blockquote className="event-popup__quote">“{event.quote}”</blockquote>}

      {episode && (
        <div className="event-popup__episode">
          <span className="event-popup__ep-dot" style={{ background: regionColor(event.region) }} />
          <span>
            {t(lang, 'episode')} {episode.id} · {pick(episode.title, lang)}
          </span>
        </div>
      )}

      {deepLink && (
        <div className="event-popup__actions">
          <button
            type="button"
            className="btn btn--play"
            onClick={playInline}
            disabled={audio === 'loading'}
            aria-busy={audio === 'loading'}
          >
            {audio === 'loading' ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {t(lang, 'audioLoading')}
              </>
            ) : (
              `${t(lang, 'playAt')} ${event.timestamp}`
            )}
          </button>
          <a className="btn btn--link" href={deepLink} target="_blank" rel="noreferrer">
            {t(lang, 'openInNewTab')}
          </a>
        </div>
      )}

      {/* Says what failed and leaves the other route open, rather than only going quiet. */}
      {audio === 'error' && (
        <p className="event-popup__audio-error" role="status">
          {t(lang, 'audioError')}
        </p>
      )}

      {showPlayer && episode && (
        <audio
          ref={audioRef}
          className="event-popup__audio"
          controls
          preload="metadata"
          src={deepLink ?? episode.audioUrl}
          /* `playing` rather than `canplay`: what matters is that sound is actually coming
             out, not that enough has buffered. `waiting` catches a stall mid-seek. */
          onPlaying={() => setAudio('ready')}
          onWaiting={() => setAudio((prev) => (prev === 'ready' ? 'ready' : 'loading'))}
          onError={() => setAudio('error')}
        />
      )}
    </div>
  );
}
