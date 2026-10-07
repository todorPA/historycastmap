import { useEffect, useRef, useState } from 'react';
import type { HistoryEvent } from '../../types/events';
import { COLLECTIONS } from '../../config/collections';
import { regionLabel } from '../../config/regions';
import { pick, t, tf } from '../../lib/i18n';
import { formatYearRange } from '../../lib/time';
import { timestampToSeconds } from '../../lib/podcast';
import { episodeLabel, type EpisodeView } from '../../lib/episodeModel';
import { episodeDate } from '../../lib/panelModel';
import { kindLabel, mmss, neighbours, publishedLabel, sameTime, youtubeSearchUrl } from '../../lib/episodeCard';
import { scrollBehavior } from '../../lib/motion';
import { useCollectionMembers, useData, useMatchingEpisodes } from '../../state/DataContext';
import { useFilters } from '../../state/FilterContext';
import Chip from '../panel/Chip';
import { useEpisodeAudio } from './useEpisodeAudio';

function Glyph({ ep }: { ep: EpisodeView }) {
  return <span className={`kind-glyph kind-glyph--${ep.kind}`} style={{ '--c': ep.era.color } as React.CSSProperties} aria-hidden="true" />;
}

/** Confidence as words plus three dots — never colour alone (§15). */
function Confidence({ level, lang }: { level: HistoryEvent['confidence']; lang: 'sr' | 'en' }) {
  const n = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  const word = t(lang, level === 'high' ? 'confidenceHigh' : level === 'medium' ? 'confidenceMedium' : 'confidenceLow');
  return (
    <span className="chapter__confidence">
      {t(lang, 'confidence')}: {word}
      <span className="chapter__dots" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'is-on' : ''} />)}
      </span>
    </span>
  );
}

/**
 * The episode card (HANDOFF §10.2), docked over the right of the map. It replaces the old
 * per-event popups: one card per episode, with its chapters inside.
 */
export default function EpisodeCard({ episode }: { episode: EpisodeView }) {
  const { placesById } = useData();
  const matching = useMatchingEpisodes();
  const members = useCollectionMembers();
  const { lang, filters, toggleFilter, selectEpisode, selectedEventId, setSelectedEventId } = useFilters();
  const { state: audio, play, toggle, audioProps } = useEpisodeAudio(episode.episode.audioUrl);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const place = placesById[episode.placeId];
  const { prev, next } = neighbours(episode, matching);
  const same = sameTime(episode, matching);
  const collections = COLLECTIONS.filter((c) => members.get(c.id)?.has(episode.id));
  const regions = [...episode.regions];

  // A chapter opened from elsewhere (a pin, the timeline) scrolls into view here.
  useEffect(() => {
    if (!selectedEventId) return;
    bodyRef.current
      ?.querySelector<HTMLElement>(`[data-chapter="${CSS.escape(selectedEventId)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }, [selectedEventId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t(lang, 'copyLink'), window.location.href);
    }
  }

  const eyebrow = [episodeLabel(episode.id, episode.series, lang), publishedLabel(episode.episode.pubDate, lang)].filter(Boolean).join(' · ');
  const progress = audio.duration > 0 ? Math.min(100, (audio.time / audio.duration) * 100) : 0;

  return (
    <aside className="ep-card" aria-labelledby="ep-card-title">
      {/* Keyed on the episode, so switching episodes replays the 150 ms content cross-fade. */}
      <div className="ep-card__body" ref={bodyRef} key={episode.id}>
        <header className="ep-card__head">
          <p className="ep-card__eyebrow">
            <span className="ep-card__dot" style={{ background: episode.era.color }} aria-hidden="true" />
            {eyebrow}
          </p>
          <button type="button" className="hc-icon-btn ep-card__close" onClick={() => selectEpisode(null)} aria-label={t(lang, 'closeCard')}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
          <h2 id="ep-card-title" className="ep-card__title">{pick(episode.title, lang)}</h2>
          <p className="ep-card__meta">
            <span className="ep-card__date"><Glyph ep={episode} /> {episodeDate(episode, lang)}</span>
            {place && (
              <span className="ep-card__place">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14s-4.5-4.4-4.5-7.5a4.5 4.5 0 0 1 9 0C12.5 9.6 8 14 8 14z" /><circle cx="8" cy="6.5" r="1.6" /></svg>
                {pick(place.name, lang)}
              </span>
            )}
          </p>
          <p className="ep-card__sub">
            {episode.family ? pick(episode.family.name, lang) : ''} · {kindLabel(episode.kind, lang)}
          </p>

          {/* Each chip toggles the filter it names (§10.2). */}
          <ul className="hc-chips ep-card__chips">
            {episode.series === 'side' && (
              <li><Chip label={t(lang, 'series_side')} active={filters.series.includes('side')} onClick={() => toggleFilter('series', 'side')} /></li>
            )}
            {regions.map((r) => (
              <li key={r}><Chip label={regionLabel(r, lang)} active={filters.regions.includes(r)} onClick={() => toggleFilter('regions', r)} /></li>
            ))}
            {collections.map((c) => (
              <li key={c.id}><Chip label={pick(c.title, lang)} active={filters.collections.includes(c.id)} onClick={() => toggleFilter('collections', c.id)} /></li>
            ))}
          </ul>

          <div className="ep-card__actions">
            <button type="button" className="hc-btn hc-btn--primary" onClick={() => play(0, pick(episode.title, lang))} disabled={!episode.episode.audioUrl}>
              ▶ {t(lang, 'listenEpisode')}
            </button>
            <a className="hc-btn" href={youtubeSearchUrl(episode)} target="_blank" rel="noreferrer">YouTube ↗</a>
            <button type="button" className="hc-btn hc-btn--icon" onClick={copyLink} title={t(lang, 'copyLinkHint')} aria-label={copied ? t(lang, 'linkCopied') : t(lang, 'copyLink')}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.6 2.6 0 0 1 3.7 3.7L10.7 8.2M9 11.5l-1.2 1.2a2.6 2.6 0 0 1-3.7-3.7L5.3 7.8" /></svg>
            </button>
          </div>

          <audio {...audioProps} hidden />
          {audio.status !== 'idle' && (
            <div className={`player player--${audio.status}`} aria-live="polite">
              {audio.status === 'error' ? (
                <p className="player__error">
                  {t(lang, 'audioBlocked')}{' '}
                  <a href={`${episode.episode.audioUrl}#t=${Math.floor(audio.from)}`} target="_blank" rel="noreferrer">{t(lang, 'openMp3')} ↗</a>
                </p>
              ) : (
                <>
                  <button type="button" className="player__toggle" onClick={toggle} aria-label={t(lang, audio.status === 'playing' ? 'pause' : 'play')}>
                    {audio.status === 'loading' ? <span className="player__spinner" aria-hidden="true" /> : audio.status === 'playing' ? '❚❚' : '▶'}
                  </button>
                  <span className="player__label">
                    {audio.status === 'loading' ? t(lang, 'audioLoading') : <>♪ {t(lang, 'nowPlaying')}: {audio.label}</>}
                  </span>
                  <span className="player__time">{mmss(audio.time)}</span>
                  <span className="player__bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>
                </>
              )}
            </div>
          )}
        </header>

        <section className="ep-card__section">
          <h3 className="hc-label">{t(lang, 'placeInHistory')}</h3>
          <div className="ep-card__neighbours">
            {[{ ep: prev, dir: 'prev' as const }, { ep: next, dir: 'next' as const }].map(({ ep, dir }) => (
              <button key={dir} type="button" className={`neighbour neighbour--${dir}`} disabled={!ep} onClick={() => ep && selectEpisode(ep.id)}>
                <span className="neighbour__when">
                  {dir === 'prev' ? `← ${t(lang, 'before')}` : `${t(lang, 'after')} →`}
                  {ep && ` · ${episodeDate(ep, lang)}`}
                </span>
                <span className="neighbour__title">{ep ? pick(ep.title, lang) : '—'}</span>
              </button>
            ))}
          </div>
        </section>

        {same.shown.length > 0 && (
          <section className="ep-card__section">
            <h3 className="hc-label">{t(lang, 'sameTime')}</h3>
            <ul className="same-time">
              {same.shown.map((ep) => (
                <li key={ep.id}>
                  <button type="button" className="same-time__row" onClick={() => selectEpisode(ep.id)}>
                    <span className="ep-card__dot" style={{ background: ep.era.color }} aria-hidden="true" />
                    <span className="same-time__title">{pick(ep.title, lang)}</span>
                    <span className="same-time__meta">
                      {episodeDate(ep, lang)}
                      {placesById[ep.placeId] && ` · ${pick(placesById[ep.placeId].name, lang)}`}
                      {ep.family && ` · ${pick(ep.family.name, lang)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {same.more > 0 && <p className="same-time__more">{tf(lang, 'andMore', { n: same.more })}</p>}
          </section>
        )}

        <section className="ep-card__section">
          <h3 className="hc-label">{t(lang, 'chapters')}</h3>
          <ol className="chapters">
            {episode.events.map((ev, i) => {
              const open = ev.id === selectedEventId;
              const at = placesById[ev.placeId];
              return (
                <li key={ev.id} className={`chapter${open ? ' is-open' : ''}`} data-chapter={ev.id}>
                  <div className="chapter__row">
                    <button type="button" className="chapter__summary" aria-expanded={open} onClick={() => setSelectedEventId(open ? null : ev.id)}>
                      <span className="chapter__year">{formatYearRange(ev.year, ev.yearEnd, lang)}</span>
                      <span className="chapter__title">{pick(ev.title, lang)}</span>
                      <span className="chapter__place">{i + 1}. {at ? pick(at.name, lang) : ''}</span>
                    </button>
                    {ev.timestamp && (
                      <button
                        type="button"
                        className="chapter__play"
                        onClick={() => play(timestampToSeconds(ev.timestamp!), pick(ev.title, lang))}
                        aria-label={`${t(lang, 'playAt')} ${ev.timestamp}`}
                      >
                        ▶ {ev.timestamp}
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="chapter__detail">
                      <p className="chapter__desc">{pick(ev.description, lang)}</p>
                      {ev.quote && <blockquote className="chapter__quote">“{ev.quote}”</blockquote>}
                      {ev.actors && ev.actors.length > 0 && (
                        <ul className="hc-chips">{ev.actors.map((a) => <li key={a}><span className="hc-chip hc-chip--static">{a}</span></li>)}</ul>
                      )}
                      <Confidence level={ev.confidence} lang={lang} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </aside>
  );
}
