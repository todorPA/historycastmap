import type { CSSProperties } from 'react';
import type { EpisodeView } from '../../lib/episodeModel';
import { pick, t, tf } from '../../lib/i18n';
import { episodeDate } from '../../lib/panelModel';
import type { Tick } from '../../lib/timelineAxis';
import { itemTop, labelInk, type Packed, type Row } from '../../lib/timelineLayout';
import type { Lang } from '../../types/events';

type Vars = CSSProperties & Record<`--${string}`, string>;

/** The selected episode's span, drawn across every row (§12.2). */
export interface FocusBand {
  x: number;
  width: number;
}

/**
 * The region rows (HANDOFF §12.3–§12.4): a label column, then a track per row with its items,
 * overflow ticks and, when the selection is off-screen, its edge pill. Geometry comes from
 * lib/timelineLayout; this only draws it.
 */
export default function TimelineRows({
  rows,
  ticks,
  focus,
  lanePx,
  lang,
  onSelect,
  onHover,
  onToggleRow,
  onEdge,
  selected,
}: {
  rows: Row<EpisodeView>[];
  ticks: Tick[];
  focus: FocusBand | null;
  lanePx: number;
  lang: Lang;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onToggleRow: (familyId: string) => void;
  onEdge: () => void;
  selected: EpisodeView | null;
}) {
  return (
    <div className="tl-rows__content">
      {/* Gridlines and the selection band sit behind every row, in the track column. */}
      <div className="tl-rows__under" aria-hidden="true">
        {ticks.map((tk) => (
          <i key={tk.year} className={`tl-gridl${tk.major ? ' is-major' : ''}`} style={{ left: tk.x }} />
        ))}
        {focus && <div className="tl-focus" style={{ left: focus.x, width: focus.width }} />}
      </div>

      {rows.map((row) => (
        <div key={row.family.id} className="tl-row" data-family={row.family.id} style={{ minHeight: row.height }}>
          <div className="tl-row__label">
            <span className="tl-row__name">{pick(row.family.name, lang)}</span>
            <span className="tl-row__count">
              {row.inWindow}/{row.total}
            </span>
            {row.toggle && (
              <button type="button" className="tl-row__more" onClick={() => onToggleRow(row.family.id)}>
                {row.toggle === 'more' ? tf(lang, 'moreInRow', { n: row.overflow.length }) : t(lang, 'collapseRow')}
              </button>
            )}
          </div>

          <div className="tl-row__track" style={{ height: row.height }}>
            {row.placed.map((it) => (
              <Item key={it.ep.id} it={it} lanePx={lanePx} lang={lang} onSelect={onSelect} onHover={onHover} />
            ))}
            {row.overflow.map((it) => (
              <i key={it.ep.id} className="tl-ovf" style={{ left: it.xa, top: row.height - 12, background: it.ep.era.color }} />
            ))}
            {row.edge && selected && (
              <button type="button" className={`tl-edge tl-edge--${row.edge}`} onClick={onEdge} title={`${t(lang, 'goTo')} ${pick(selected.title, lang)}`}>
                {row.edge === 'l' && '‹ '}
                {pick(selected.title, lang)} <span className="tl-num">{episodeDate(selected, lang)}</span>
                {row.edge === 'r' && ' ›'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Item({
  it,
  lanePx,
  lang,
  onSelect,
  onHover,
}: {
  it: Packed<EpisodeView>;
  lanePx: number;
  lang: Lang;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { ep } = it;
  const colour = ep.era.color;
  const title = pick(ep.title, lang);
  const date = episodeDate(ep, lang);
  const mark: CSSProperties =
    ep.kind === 'point' ? { left: (it.m0 + it.m1) / 2 - it.e0 } : { left: it.m0 - it.e0, width: it.m1 - it.m0 };
  const style: Vars = {
    left: it.e0,
    top: itemTop(it.lane, lanePx),
    width: it.e1 - it.e0,
    height: lanePx - 6,
    '--c': colour,
    '--on': labelInk(colour),
  };
  return (
    // Not in the tab order: the episode list is the keyboard route to every episode, and 178
    // stops here would bury the rest of the page.
    <button
      type="button"
      tabIndex={-1}
      className={`tl-it tl-it--${ep.kind} is-${it.state}`}
      style={style}
      title={`${title} · ${date}`}
      onClick={() => onSelect(ep.id)}
      onMouseEnter={() => onHover(ep.id)}
      onMouseLeave={() => onHover(null)}
    >
      <i className="tl-it__m" style={mark} />
      <span
        className={`tl-it__lbl${it.inside ? ' in' : ''}`}
        style={{ left: it.lx - it.e0, maxWidth: it.inside ? it.m1 - it.lx - 6 : 300 }}
      >
        {title}
        <small>{date}</small>
      </span>
    </button>
  );
}
