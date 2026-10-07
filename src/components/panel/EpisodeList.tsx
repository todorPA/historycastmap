import { Fragment, useEffect, useMemo, useRef } from 'react';
import type { Lang } from '../../types/events';
import { pick, t } from '../../lib/i18n';
import { formatYear } from '../../lib/time';
import { episodeDate, groupByEra } from '../../lib/panelModel';
import { needsMatchLine, searchEpisode, type SearchHit } from '../../lib/episodeSearch';
import { overlaps } from '../../lib/episodeVisibility';
import { scrollBehavior } from '../../lib/motion';
import type { EpisodeView } from '../../lib/episodeModel';
import { useData, useMatchingEpisodes } from '../../state/DataContext';
import { useFilters } from '../../state/FilterContext';
import { useTime } from '../../state/TimeContext';

/** The order the list shows episodes in — by era, then chronological. Enter picks the first. */
export function useListOrder(): EpisodeView[] {
  const matching = useMatchingEpisodes();
  return useMemo(() => groupByEra(matching, { from: -Infinity, to: Infinity }).flatMap((g) => g.episodes), [matching]);
}

/** `text` with [start, end) wrapped in <mark>. */
function Highlight({ text, range }: { text: string; range?: [number, number] }) {
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range[0])}
      <mark>{text.slice(range[0], range[1])}</mark>
      {text.slice(range[1])}
    </>
  );
}

/** The line under a row saying where the search matched, when it was not the title (§5). */
function MatchLine({ hit, lang }: { hit: SearchHit; lang: Lang }) {
  switch (hit.field) {
    case 'event':
      return (
        <span className="ep-row__match">
          ↳ {hit.year !== undefined && `${formatYear(hit.year, lang)} · `}
          <Highlight text={hit.text} range={hit.range} />
        </span>
      );
    case 'actor':
      return (
        <span className="ep-row__match">
          {t(lang, 'matchPerson')}: <Highlight text={hit.text} range={hit.range} />
        </span>
      );
    case 'place':
      return (
        <span className="ep-row__match">
          {t(lang, 'matchPlace')}: <Highlight text={hit.text} range={hit.range} />
        </span>
      );
    case 'title':
      // Only reached for the title in the other language (needsMatchLine).
      return (
        <span className="ep-row__match">
          ↳ <Highlight text={hit.text} range={hit.range} />
        </span>
      );
    default:
      return null; // number and year matches are visible in the row itself
  }
}

/**
 * The episode list, grouped by era (HANDOFF §7). Clicking a row selects its episode — and
 * clicking the selected row again deselects it. ↑/↓ move between rows. Hover is shared state,
 * so a row lights up when the same episode is hovered on the map or timeline.
 */
export default function EpisodeList({ onClearAll }: { onClearAll: () => void }) {
  const matching = useMatchingEpisodes();
  const { placesById } = useData();
  const { range } = useTime();
  const { lang, query, selectedEpisodeId, toggleEpisode, hoveredEpisodeId, setHoveredEpisodeId } = useFilters();
  const groups = useMemo(() => groupByEra(matching, range), [matching, range]);
  const listRef = useRef<HTMLDivElement>(null);

  // A selection made anywhere (map, timeline, link) scrolls its row into view.
  useEffect(() => {
    if (!selectedEpisodeId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-episode="${CSS.escape(selectedEpisodeId)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
  }, [selectedEpisodeId]);

  if (matching.length === 0) {
    return (
      <div className="ep-empty">
        <p className="ep-empty__title">{t(lang, 'emptyFilters')}</p>
        <p className="ep-empty__hint">{t(lang, 'emptyFiltersHint')}</p>
        <button type="button" className="hc-link" onClick={onClearAll}>
          {t(lang, 'clearAll')}
        </button>
      </div>
    );
  }

  /** ↑/↓ between rows, wherever focus is in the list. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('.ep-row') ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = rows[Math.max(0, Math.min(rows.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  return (
    <div className="ep-list" ref={listRef} onKeyDown={onKeyDown}>
      {groups.map((g) => (
        <Fragment key={g.era.id}>
          <h3 className="era-head">
            <span className="era-head__swatch" style={{ background: g.era.color }} aria-hidden="true" />
            <span className="era-head__name">{pick(g.era.name, lang)}</span>
            <span className="era-head__years">
              {g.era.from === -Infinity ? `–${formatYear(g.era.to, lang)}` : g.era.to === Infinity ? `${formatYear(g.era.from, lang)}–` : `${formatYear(g.era.from, lang)}–${formatYear(g.era.to, lang)}`}
            </span>
            <span className="era-head__count">
              {g.inWindow === g.episodes.length ? g.episodes.length : `${g.inWindow}/${g.episodes.length}`}
            </span>
          </h3>
          <ul className="ep-list__rows">
            {g.episodes.map((ep) => {
              const hit = query ? searchEpisode(ep, query, placesById, lang) : null;
              const shownTitle = pick(ep.title, lang);
              const titleRange = hit?.field === 'title' && hit.text === shownTitle ? hit.range : undefined;
              const place = placesById[ep.placeId];
              const outside = !overlaps(ep.from, ep.to, range);
              const cls = [
                'ep-row',
                ep.id === selectedEpisodeId && 'is-selected',
                ep.id === hoveredEpisodeId && 'is-hovered',
                outside && 'is-outside',
              ].filter(Boolean).join(' ');
              return (
                <li key={ep.id}>
                  <button
                    type="button"
                    className={cls}
                    data-episode={ep.id}
                    aria-current={ep.id === selectedEpisodeId ? 'true' : undefined}
                    onClick={() => toggleEpisode(ep.id)}
                    onMouseEnter={() => setHoveredEpisodeId(ep.id)}
                    onMouseLeave={() => setHoveredEpisodeId(null)}
                    onFocus={() => setHoveredEpisodeId(ep.id)}
                    onBlur={() => setHoveredEpisodeId(null)}
                  >
                    <span className={`kind-glyph kind-glyph--${ep.kind}`} style={{ '--c': ep.era.color } as React.CSSProperties} aria-hidden="true" />
                    <span className="ep-row__body">
                      <span className="ep-row__title">
                        <Highlight text={shownTitle} range={titleRange} />
                      </span>
                      <span className="ep-row__meta">
                        {episodeDate(ep, lang)}
                        {place && ` · ${pick(place.name, lang)}`}
                      </span>
                      {hit && needsMatchLine(hit, shownTitle) && <MatchLine hit={hit} lang={lang} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Fragment>
      ))}
    </div>
  );
}
