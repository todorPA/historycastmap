/**
 * Landing page entry.
 *
 * Two jobs, both deliberately small:
 *
 *  1. One orchestrated entrance, on the hero only. The previous version faded and slid up
 *     twelve elements across every section, which is the generic scroll-reveal default and
 *     reads as machine-made. A single staged moment at the top, then stillness, gives the
 *     motion somewhere to land.
 *  2. Upgrade the hero figure from a static image to the live map.
 *
 * Both are opt-in: the `js-ready` class is what arms the animation, so if this module never
 * runs the page is simply visible, and `prefers-reduced-motion` skips straight to the end.
 */
import { mountHeroMap } from './hero-map';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduced) {
  root.classList.add('js-ready', 'is-entered');
} else {
  root.classList.add('js-ready');
  // One frame, so the initial state is painted before the transition begins.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.add('is-entered'));
  });
}

const host = document.getElementById('hero-map');
if (host) {
  mountHeroMap(host).catch(() => {
    // The static image is already in place; a failed upgrade should leave it alone.
  });
}
