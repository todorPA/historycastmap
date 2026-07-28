import { useRef, useState } from 'react';
import type { HistoryEvent } from '../types/events';
import { useData } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';
import { formatYearRange } from '../lib/time';
import { buildPodcastLink, timestampToSeconds } from '../lib/podcast';

export default function EventPopup({ event }: { event: HistoryEvent }) {
  const { placesById, episodesById } = useData();
  const { lang } = useFilters();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

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
    requestAnimationFrame(() => {
      const el = audioRef.current;
      if (!el) return;
      const seek = () => {
        if (Number.isFinite(el.duration) && seconds < el.duration) el.currentTime = seconds;
        void el.play();
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
          <span className="event-popup__ep-dot" style={{ background: episode.color ?? '#7f8c8d' }} />
          <span>
            {t(lang, 'episode')} {episode.id} · {pick(episode.title, lang)}
          </span>
        </div>
      )}

      {deepLink && (
        <div className="event-popup__actions">
          <button type="button" className="btn btn--play" onClick={playInline}>
            {t(lang, 'playAt')} {event.timestamp}
          </button>
          <a className="btn btn--link" href={deepLink} target="_blank" rel="noreferrer">
            {t(lang, 'openInNewTab')}
          </a>
        </div>
      )}

      {showPlayer && episode && (
        <audio
          ref={audioRef}
          className="event-popup__audio"
          controls
          preload="metadata"
          src={deepLink ?? episode.audioUrl}
        />
      )}
    </div>
  );
}
