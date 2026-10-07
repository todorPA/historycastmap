import { useMemo, useState } from 'react';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { divIcon, latLngBounds, point, type DivIcon } from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import { pick } from '../../lib/i18n';
import { episodeDate } from '../../lib/panelModel';
import { CELL_PX, clusterByPixel } from '../../lib/cluster';
import { chapterPins, clusterClick, clusterSize, eraRing, markerState, type MarkerState } from '../../lib/episodeMarkers';
import { chronological } from '../../lib/panelModel';
import type { EpisodeView } from '../../lib/episodeModel';
import { useData } from '../../state/DataContext';
import { useFilters } from '../../state/FilterContext';
import { useTime } from '../../state/TimeContext';

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Icons are cached by everything that shapes them, so a re-render with nothing changed hands
 * Leaflet the same icon object and it keeps the DOM — no flicker, no lost focus.
 */
const iconCache = new Map<string, DivIcon>();
function cachedIcon(key: string, make: () => DivIcon): DivIcon {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = make();
    iconCache.set(key, icon);
  }
  return icon;
}

/** The marker's label chip: title, and the date for hover and selection (§9.1). */
function episodeIcon(ep: EpisodeView, state: MarkerState, date: string, title: string): DivIcon {
  return cachedIcon(`ep|${ep.id}|${state}|${title}|${date}`, () => {
    const label = state === 'hover' || state === 'selected'
      ? `<span class="ep-mark__label">${escape(title)} <span class="ep-mark__date">${escape(date)}</span></span>`
      : '';
    return divIcon({
      className: `ep-mark-icon ep-mark-icon--${state}`,
      iconSize: [0, 0], // the visible dot is sized and centred by CSS, so every state shares an anchor
      html: `<span class="ep-mark ep-mark--${state}" style="--c:${ep.era.color}"></span>${label}`,
    });
  });
}

function clusterIcon(members: EpisodeView[], hovered: boolean): DivIcon {
  const size = clusterSize(members.length);
  const ring = eraRing(members);
  return cachedIcon(`cl|${members.length}|${ring}|${hovered}`, () =>
    divIcon({
      className: `ep-cluster-icon${hovered ? ' is-hovered' : ''}`,
      iconSize: [size, size],
      html: `<span class="ep-cluster" style="--size:${size}px;background:${ring}"><span class="ep-cluster__count">${members.length}</span></span>`,
    }),
  );
}

function pinIcon(n: number, active: boolean): DivIcon {
  return cachedIcon(`pin|${n}|${active}`, () =>
    divIcon({ className: `ch-pin-icon${active ? ' is-active' : ''}`, iconSize: [18, 18], html: `<span class="ch-pin">${n}</span>` }),
  );
}

interface Item {
  id: string;
  position: LatLngTuple;
  color: string;
  ep: EpisodeView;
}

/**
 * Every map mark (HANDOFF §9.1): a marker per episode, era-ringed clusters with a list for
 * stacks that zooming cannot separate, and the selected episode's chapter pins.
 */
export default function EpisodeLayer({ episodes }: { episodes: EpisodeView[] }) {
  const map = useMap();
  const { placesById } = useData();
  const { range } = useTime();
  const { lang, selectedEpisodeId, selectEpisode, hoveredEpisodeId, setHoveredEpisodeId, selectedEventId, setSelectedEventId } = useFilters();
  const [zoom, setZoom] = useState(() => map.getZoom());
  const [list, setList] = useState<{ at: LatLngTuple; members: EpisodeView[] } | null>(null);
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    // An empty-map click closes the list; it does not deselect (decision of 2026-10-05).
    click: () => setList(null),
  });

  const ctx = { selectedId: selectedEpisodeId, hoveredId: hoveredEpisodeId, range };
  const items: Item[] = useMemo(
    () =>
      episodes.flatMap((ep) => {
        const p = placesById[ep.placeId];
        return p ? [{ id: ep.id, position: [p.lat, p.lng] as LatLngTuple, color: ep.era.color, ep }] : [];
      }),
    [episodes, placesById],
  );

  // Outside the window: small, faded, never clustered (§9.1). The selected one is always its own.
  const isOutside = (i: Item) => i.id !== selectedEpisodeId && markerState(i.ep, { ...ctx, hoveredId: null }) === 'outside';
  const outside = items.filter(isOutside);
  const clusters = useMemo(
    () => clusterByPixel(map, items.filter((i) => !isOutside(i)), CELL_PX, (i) => i.id === selectedEpisodeId),
    // `zoom` is what changes the projection; the map object itself never changes identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, items, zoom, selectedEpisodeId, range.from, range.to],
  );

  const selected = episodes.find((e) => e.id === selectedEpisodeId);
  const pins = selected ? chapterPins(selected) : [];

  const marker = (i: Item) => {
    const state = markerState(i.ep, ctx);
    const title = pick(i.ep.title, lang);
    return (
      <Marker
        key={i.id}
        position={i.position}
        icon={episodeIcon(i.ep, state, episodeDate(i.ep, lang), title)}
        zIndexOffset={state === 'selected' ? 1000 : state === 'hover' ? 900 : state === 'outside' ? -500 : 0}
        keyboard
        title={`${title} — ${episodeDate(i.ep, lang)}`}
        eventHandlers={{
          click: () => selectEpisode(i.id),
          mouseover: () => setHoveredEpisodeId(i.id),
          mouseout: () => setHoveredEpisodeId(null),
        }}
      />
    );
  };

  return (
    <>
      {outside.map(marker)}

      {clusters.map((c) => {
        if (c.items.length === 1) return marker(c.items[0]);
        const members = c.items.map((i) => i.ep);
        const hovered = members.some((e) => e.id === hoveredEpisodeId);
        return (
          <Marker
            key={c.key}
            position={c.position}
            icon={clusterIcon(members, hovered)}
            keyboard
            title={members.length.toString()}
            eventHandlers={{
              click: () => {
                const bounds = latLngBounds(c.items.map((i) => i.position));
                const fitZoom = map.getBoundsZoom(bounds, false, point(160, 160)); // 80 px each side
                const maxZoom = Number.isFinite(map.getMaxZoom()) ? map.getMaxZoom() : 18;
                const action = clusterClick({ zoom: map.getZoom(), fitZoom, maxZoom });
                if (action === 'list') setList({ at: c.position, members: [...members].sort(chronological) });
                else map.setView(bounds.getCenter(), action.zoomTo);
              },
            }}
          />
        );
      })}

      {pins.map((pin) => {
        const p = placesById[pin.placeId];
        if (!p) return null;
        return (
          <Marker
            key={`pin:${pin.placeId}`}
            position={[p.lat, p.lng]}
            icon={pinIcon(pin.number, pin.eventIds.includes(selectedEventId ?? ''))}
            zIndexOffset={1100}
            keyboard
            title={pick(p.name, lang)}
            eventHandlers={{ click: () => setSelectedEventId(pin.eventIds[0]) }}
          />
        );
      })}

      {list && (
        <Popup position={list.at} className="cluster-list-popup" minWidth={260} maxWidth={320} eventHandlers={{ remove: () => setList(null) }}>
          <ul className="cluster-list">
            {list.members.map((ep) => (
              <li key={ep.id}>
                <button
                  type="button"
                  className="cluster-list__row"
                  onClick={() => {
                    setList(null);
                    selectEpisode(ep.id);
                  }}
                  onMouseEnter={() => setHoveredEpisodeId(ep.id)}
                  onMouseLeave={() => setHoveredEpisodeId(null)}
                >
                  <span className={`kind-glyph kind-glyph--${ep.kind}`} style={{ '--c': ep.era.color } as React.CSSProperties} aria-hidden="true" />
                  <span className="cluster-list__title">{pick(ep.title, lang)}</span>
                  <span className="cluster-list__date">{episodeDate(ep, lang)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Popup>
      )}
    </>
  );
}
