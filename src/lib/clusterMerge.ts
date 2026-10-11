/**
 * The grid clusters by cell, then draws each cluster at its members' centroid — so two clusters
 * from neighbouring cells can land closer than their bubbles are wide, and the bigger count hides
 * under the smaller (Belgrade's 35 under Smederevo's 2). This second pass merges any two whose
 * bubbles overlap by more than a third of the smaller one's diameter, at the member-weighted
 * centre, until no such pair is left. Zooming in still splits them: the grid runs first.
 */
export interface PixelGroup<T> {
  x: number;
  y: number;
  items: T[];
}

const MIN_OVERLAP_SHARE = 1 / 3;

export function mergeOverlapping<T>(groups: PixelGroup<T>[], diameter: (n: number) => number): PixelGroup<T>[] {
  const out = groups.map((g) => ({ ...g, items: [...g.items] }));
  for (;;) {
    let pair: [number, number] | null = null;
    search: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i];
        const b = out[j];
        const da = diameter(a.items.length);
        const db = diameter(b.items.length);
        const overlap = (da + db) / 2 - Math.hypot(a.x - b.x, a.y - b.y);
        if (overlap > Math.min(da, db) * MIN_OVERLAP_SHARE) {
          pair = [i, j];
          break search;
        }
      }
    }
    if (!pair) return out;
    const [i, j] = pair;
    const a = out[i];
    const b = out[j];
    const n = a.items.length + b.items.length;
    out[i] = {
      x: (a.x * a.items.length + b.x * b.items.length) / n,
      y: (a.y * a.items.length + b.y * b.items.length) / n,
      // The larger group first, so its identity (and key) survives the merge.
      items: a.items.length >= b.items.length ? [...a.items, ...b.items] : [...b.items, ...a.items],
    };
    out.splice(j, 1);
  }
}
