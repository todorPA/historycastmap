/**
 * Degree steps, coarse to fine. A graticule that subdivides continuously turns into a mesh,
 * so the ladder is deliberately sparse and stays on round coordinates.
 *
 * It runs down to 0.0001° because OSM zooms to 19, where the whole viewport spans about
 * 0.0014°. Stopping at 0.001° left the grid at under two divisions for the last two zoom
 * levels — the same thinning this function exists to prevent (graticule.test.ts).
 */
const STEPS = [
  30, 15, 10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005, 0.0002,
  0.0001,
];

/**
 * Chosen from the visible span rather than from the zoom level, so the grid holds roughly
 * four to eight divisions at *every* scale.
 *
 * A zoom→spacing table looked simpler and was wrong in the one case that matters: it bottomed
 * out at 0.5°, so past about z12 the span was smaller than the step and the graticule thinned
 * to a single line or vanished. That is exactly where the basemap has nothing to draw and the
 * grid is the only thing telling you this is a map.
 */
export function spacingFor(span: number): number {
  const target = span / 5;
  for (const step of STEPS) if (step <= target) return step;
  return STEPS[STEPS.length - 1];
}
