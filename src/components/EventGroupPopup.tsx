import { useRef, useState } from 'react';
import type { HistoryEvent } from '../types/events';
import { useData } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { pick, t } from '../lib/i18n';
import { formatYear } from '../lib/time';
import { buildPodcastLink, timestampToSeconds } from '../lib/podcast';
import { regionColor } from '../config/regions';

/**
 * Several events at the same place in the same year. They may be one fact told by several
 * episodes (Kosovo 1389 appears in 95 and 144) or genuinely different events (London 1940:
 * Churchill becomes PM, de Gaulle broadcasts, Popov sets up his cover firm). We don't try to
 * tell those apart — guessing sameness from titles both misses real duplicates and merges
 * distinct ones. The marker just says "this place, this year", and the list says what and
 * from which episode.
 */
export default function EventGroupPopup({ events }: { events: HistoryEvent[] }) {
  const { placesById, episodesById } = useData();
  const { lang, setSelectedEventId } = useFilters();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<HistoryEvent | null>(null);

  const place = placesById[events[0].placeId];
  const year = events[0].year;

  function play(event: HistoryEvent) {
    setPlaying(event);
    setSelectedEventId(event.id);
    const seconds = event.timestamp ? timestampToSeconds(event.timestamp) : 0;
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

  const playingEpisode = playing ? episodesById[playing.episodeId] : undefined;

  return (
    <div className="event-popup group-popup">
      <h3 className="event-popup__title">
        {place ? pick(place.name, lang) : ''} · {formatYear(year, lang)}
      </h3>
      <p className="group-popup__count">
        {events.length} {t(lang, 'eventsHere')}
      </p>

      <ul className="group-popup__list">
        {events.map((event) => {
          const episode = episodesById[event.episodeId];
          return (
            <li key={event.id} className="group-popup__item">
              <span
                className="group-popup__dot"
                style={{ background: regionColor(event.region) }}
              />
              <div className="group-popup__body">
                <div className="group-popup__name">{pick(event.title, lang)}</div>
                <div className="group-popup__meta">
                  {episode ? `${t(lang, 'episode')} ${episode.id} · ${pick(episode.title, lang)}` : ''}
                </div>
              </div>
              {episode && event.timestamp && (
                <button
                  type="button"
                  className="btn btn--play btn--tiny"
                  onClick={() => play(event)}
                  title={`${t(lang, 'playAt')} ${event.timestamp}`}
                >
                  ▶ {event.timestamp}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {playing && playingEpisode && (
        <audio
          ref={audioRef}
          className="event-popup__audio"
          controls
          preload="metadata"
          src={
            playing.timestamp
              ? buildPodcastLink(playingEpisode.audioUrl, playing.timestamp)
              : playingEpisode.audioUrl
          }
        />
      )}
    </div>
  );
}
