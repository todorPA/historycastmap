/**
 * The reader's reduced-motion setting, for motion started from script.
 *
 * theme.css shortens CSS transitions and animations under `prefers-reduced-motion`, but a call
 * like `scrollIntoView({ behavior: 'smooth' })` or Leaflet's `panTo(…, { animate: true })`
 * animates regardless of any stylesheet, so script has to ask.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** For scrollIntoView / scrollTo: instant when the reader asked for less motion. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
