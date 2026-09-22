import { useMemo } from 'react';
import { useData } from '../state/DataContext';
import { useFilters } from '../state/FilterContext';
import { useTime } from '../state/TimeContext';
import { isVisible, useCollectionEpisodes, useSideEpisodes } from '../state/DataContext';
import { regionColor } from '../config/regions';
import { t } from '../lib/i18n';
import type { UiKey } from '../lib/i18n';

/** Event types, in the schema's order; labels live in i18n under `type_<value>`. */
const TYPES = [
  'battle',
  'siege',
  'conquest',
  'coronation',
  'treaty',
  'founding',
  'death',
  'birth',
  'reign',
  'uprising',
  'reform',
  'other',
] as const;

/** Two shows, in the order they read: the main run first, the thematic slot second. */
const SERIES = ['main', 'side'] as const;

export default function FacetFilters() {
  const { data } = useData();
  const { range } = useTime();
  const {
    lang,
    activeCollectionId,
    activeEpisodeId,
    activeRegions,
    toggleRegion,
    activeTypes,
    toggleType,
    activeSeries,
    toggleSeries,
    clearFacets,
  } = useFilters();
  const activeCollectionEpisodes = useCollectionEpisodes(activeCollectionId);
  const sideEpisodeIds = useSideEpisodes();

  /**
   * Counts ignore the facet being counted, so a chip shows what picking it would yield
   * rather than what's left after it — otherwise every unpicked chip reads 0 as soon as one
   * is picked, which makes the filter look broken.
   */
  const { regionCounts, typeCounts, seriesCounts } = useMemo(() => {
    const regionCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const seriesCounts: Record<string, number> = {};
    for (const event of data.events) {
      if (
        isVisible(event, {
          activeCollectionEpisodes,
          activeEpisodeId,
          activeRegions: [],
          activeTypes,
          activeSeries,
          sideEpisodeIds,
          range,
        })
      ) {
        const key = event.region ?? '';
        if (key) regionCounts[key] = (regionCounts[key] ?? 0) + 1;
      }
      if (
        isVisible(event, {
          activeCollectionEpisodes,
          activeEpisodeId,
          activeRegions,
          activeTypes: [],
          activeSeries,
          sideEpisodeIds,
          range,
        })
      ) {
        const key = event.type ?? '';
        if (key) typeCounts[key] = (typeCounts[key] ?? 0) + 1;
      }
      if (
        isVisible(event, {
          activeCollectionEpisodes,
          activeEpisodeId,
          activeRegions,
          activeTypes,
          activeSeries: [],
          sideEpisodeIds,
          range,
        })
      ) {
        const key = sideEpisodeIds.has(event.episodeId) ? 'side' : 'main';
        seriesCounts[key] = (seriesCounts[key] ?? 0) + 1;
      }
    }
    return { regionCounts, typeCounts, seriesCounts };
  }, [
    data.events,
    activeCollectionEpisodes,
    activeEpisodeId,
    activeRegions,
    activeTypes,
    activeSeries,
    sideEpisodeIds,
    range,
  ]);

  /**
   * Anything active is always listed, even at a count of zero.
   *
   * The counts above are scoped to the current episode and range, so a filter chosen under
   * one episode can fall out of scope under another. Listing only what has a count then hid
   * the active filter completely: the map went empty, the sidebar showed no reason why, and
   * the only way back was the Clear link. Keeping it visible at 0 makes it both explicable
   * and removable.
   */
  const regions = Array.from(new Set([...Object.keys(regionCounts), ...activeRegions])).sort(
    (a, b) => (regionCounts[b] ?? 0) - (regionCounts[a] ?? 0) || a.localeCompare(b),
  );
  const types = TYPES.filter((type) => typeCounts[type] > 0 || activeTypes.includes(type));
  /**
   * The series group hides itself when the dataset has only one show in it — a chip pair
   * where one side can never be anything but 0 is a control that explains nothing. That is
   * the case for `?data=sample` and for the full set until the side-series backlog lands.
   */
  const series = SERIES.filter((id) => seriesCounts[id] > 0 || activeSeries.includes(id));
  const showSeries = series.length > 1;
  const anyActive = activeRegions.length > 0 || activeTypes.length > 0 || activeSeries.length > 0;

  if (regions.length === 0 && types.length === 0 && !showSeries) return null;

  return (
    <section className="sidebar__section facets">
      <div className="facets__head">
        <h2 className="sidebar__h2">{t(lang, 'filters')}</h2>
        {anyActive && (
          <button type="button" className="facets__clear" onClick={clearFacets}>
            {t(lang, 'clearFilters')}
          </button>
        )}
      </div>

      {showSeries && (
        <>
          <h3 className="facets__label">{t(lang, 'series')}</h3>
          <ul className="chips chips--facet">
            {series.map((id) => {
              const active = activeSeries.includes(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`chip chip--btn${active ? ' is-active' : ''}${
                      (seriesCounts[id] ?? 0) === 0 ? ' is-empty' : ''
                    }`}
                    aria-pressed={active}
                    onClick={() => toggleSeries(id)}
                  >
                    {t(lang, `series_${id}` as UiKey)}
                    <span className="chip__count">{seriesCounts[id] ?? 0}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3 className="facets__label">{t(lang, 'region')}</h3>
      <ul className="chips chips--facet">
        {regions.map((region) => {
          const active = activeRegions.includes(region);
          return (
            <li key={region}>
              <button
                type="button"
                className={`chip chip--btn${active ? ' is-active' : ''}${
                  (regionCounts[region] ?? 0) === 0 ? ' is-empty' : ''
                }`}
                aria-pressed={active}
                onClick={() => toggleRegion(region)}
              >
                <span className="chip__dot" style={{ background: regionColor(region) }} />
                {region}
                <span className="chip__count">{regionCounts[region] ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="facets__label">{t(lang, 'type')}</h3>
      <ul className="chips chips--facet">
        {types.map((type) => {
          const active = activeTypes.includes(type);
          return (
            <li key={type}>
              <button
                type="button"
                className={`chip chip--btn${active ? ' is-active' : ''}${
                  (typeCounts[type] ?? 0) === 0 ? ' is-empty' : ''
                }`}
                aria-pressed={active}
                onClick={() => toggleType(type)}
              >
                {t(lang, `type_${type}` as UiKey)}
                <span className="chip__count">{typeCounts[type] ?? 0}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
