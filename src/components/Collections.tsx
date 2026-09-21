import { useData } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { useTime } from '../state/TimeContext';
import { COLLECTIONS, collectionBlurb, collectionSpan, collectionTitle } from '../config/collections';
import { t } from '../lib/i18n';

/**
 * The archive's front door.
 *
 * Opening the explorer otherwise means choosing between 456 events and a 102-item episode
 * list ordered by production number, which offers no way in for anyone who does not already
 * know what they are looking for. These are six hand-picked subjects (config/collections.ts).
 *
 * Counts are of the whole collection, not of what is currently visible: this is the control
 * you reach for *before* narrowing, so showing it shrink as you filter would be answering a
 * question nobody asked.
 */
export default function Collections() {
  const { data } = useData();
  const { lang, activeCollectionId, toggleCollection } = useFilters();
  const { setRange, resetRange } = useTime();

  const countFor = (episodeIds: string[]) => {
    const set = new Set(episodeIds);
    return data.events.reduce((n, e) => (set.has(e.episodeId) ? n + 1 : n), 0);
  };

  const active = COLLECTIONS.find((c) => c.id === activeCollectionId);


  /**
   * Choosing a collection also frames it in time, because otherwise the axis keeps the
   * dataset's full 1200 BC to 2006 extent and a collection spanning three centuries arrives
   * as a smear against one edge.
   *
   * Done here, on the click, rather than in an effect watching the collection: an effect
   * would also fire for `?col=x&from=..&to=..`, overwriting a range the link asked for.
   */
  function choose(id: string) {
    const wasActive = id === activeCollectionId;
    toggleCollection(id);

    if (wasActive) {
      resetRange();
      return;
    }

    const collection = COLLECTIONS.find((c) => c.id === id);
    const span = collection && collectionSpan(collection, data.events);
    if (span) setRange(span.from, span.to);
  }

  return (
    <section className="sidebar__section collections">
      <h2 className="sidebar__h2">{t(lang, 'collections')}</h2>

      <ul className="collections__list">
        {COLLECTIONS.map((collection) => {
          const isActive = collection.id === activeCollectionId;
          const count = countFor(collection.episodeIds);
          return (
            <li key={collection.id}>
              <button
                type="button"
                className={`collection${isActive ? ' is-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => choose(collection.id)}
              >
                <span className="collection__title">{collectionTitle(collection, lang)}</span>
                <span className="collection__count">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The blurb belongs to the chosen collection, so it appears only once there is one
          to describe rather than as six lines of permanent explanation. */}
      {active && <p className="collections__blurb">{collectionBlurb(active, lang)}</p>}
    </section>
  );
}
