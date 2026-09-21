/**
 * Landing hero map.
 *
 * Item 5 of the design review: the hero used to be a downscaled screenshot of the explorer,
 * which at roughly 590px was unreadable and said only "an app exists". This is the product's
 * actual claim, running: real events from the real dataset, at their real coordinates,
 * coloured by region, each one openable in the explorer.
 *
 * Leaflet is imported dynamically, so the landing page's initial payload stays small and the
 * headline never waits on a map library. The figure keeps its aspect ratio from CSS, so
 * nothing reflows when the map arrives.
 */
import type { GeoData } from '../types/events';
import { regionColor } from '../config/regions';

/**
 * Leaflet's own stylesheet, which is not optional: it is what makes `.leaflet-pane` and
 * friends `position: absolute`. Without it the panes stack in normal flow, so the tile grid
 * lays out as a column and markers are projected thousands of pixels below the map. The
 * explorer gets this from main.tsx; this page needs its own import. It rides along in this
 * module's async chunk, so it stays off the landing page's critical path.
 */
import 'leaflet/dist/leaflet.css';

/** Balkans-centred: where the podcast's density actually is, and legible at hero size. */
const CENTER: [number, number] = [43.6, 20.5];
const ZOOM = 5;

/** Enough to read as a cluster of history, few enough that no single marker is noise. */
const MAX_MARKERS = 70;
const LAT_SPAN = 13;
const LNG_SPAN = 24;

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const formatYear = (year: number) => (year < 0 ? `${-year}. p.n.e.` : String(year));

export async function mountHeroMap(host: HTMLElement): Promise<void> {
  // Bail before fetching anything heavy if the browser asked us not to.
  if (window.matchMedia('(prefers-reduced-data: reduce)').matches) return;

  const base = import.meta.env.BASE_URL;

  const [leaflet, res] = await Promise.all([
    import('leaflet'),
    fetch(`${base}data/geo-events.json`),
  ]);
  if (!res.ok) return;

  const L = leaflet.default;
  const data: GeoData = await res.json();

  const placeById = new Map(data.places.map((p) => [p.id, p]));
  const episodeById = new Map(data.episodes.map((ep) => [ep.id, ep]));

  const points = data.events
    .map((e) => {
      const place = placeById.get(e.placeId);
      return place ? { event: e, place } : null;
    })
    .filter((p): p is NonNullable<typeof p> => {
      if (!p) return false;
      return (
        Math.abs(p.place.lat - CENTER[0]) < LAT_SPAN &&
        Math.abs(p.place.lng - CENTER[1]) < LNG_SPAN
      );
    })
    .slice(0, MAX_MARKERS);

  if (points.length === 0) return;

  // Leaflet needs an element with a definite size, and it stamps its own classes and
  // inline styles onto whatever it is handed. Give it a dedicated absolutely-positioned
  // child so the host keeps its aspect-ratio box: handing it the host directly made the
  // host the Leaflet container, which dropped the ratio and grew the hero to 3686px.
  const canvas = document.createElement('div');
  canvas.className = 'hero__map-canvas';
  host.replaceChildren(canvas);
  host.classList.add('is-live');

  const map = L.map(canvas, {
    center: CENTER,
    zoom: ZOOM,
    zoomControl: false,
    // The hero is a view, not a workspace: no scroll hijacking, no zooming out to grey space.
    scrollWheelZoom: false,
    doubleClickZoom: false,
    keyboard: false,
    minZoom: ZOOM - 1,
    maxZoom: ZOOM + 3,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  /**
   * The canvas is absolutely positioned inside an aspect-ratio box, so its size is only
   * known after layout, which is later than construction. Leaflet caches the size it
   * measured at construction and derives its pixel origin from it, so a stale reading
   * leaves tiles misaligned and markers projected off-screen.
   *
   * A single requestAnimationFrame is not enough (it can still land before layout). Observe
   * the element instead: this fires on the first real measurement and again on any resize,
   * which is also what keeps the map correct when the hero reflows.
   */
  const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
  ro.observe(canvas);

  for (const { event, place } of points) {
    const title = escape(event.title.sr);
    const year = formatYear(event.year);
    const episode = episodeById.get(event.episodeId);

    L.circleMarker([place.lat, place.lng], {
      radius: 7,
      // Same ring device as the explorer, for the same reason (config/regions.ts).
      color: 'rgba(18, 23, 29, 0.85)',
      weight: 1.5,
      fillColor: regionColor(event.region),
      fillOpacity: 0.95,
    })
      .addTo(map)
      .bindTooltip(`${title} · ${year}`, { direction: 'top', opacity: 1 })
      .bindPopup(
        `<strong>${title}</strong><br>${year} · ${escape(place.name.sr)}` +
          (episode ? `<br>${escape(episode.title.sr)}` : '') +
          // `e` is the explorer's event parameter (lib/urlState.ts PARAM.event). Using the
          // spelled-out `event` here silently did nothing: the app fell back to no selection.
          `<br><a href="${base}app.html?e=${encodeURIComponent(event.id)}">Otvori u mapi</a>`,
      );
  }
}
