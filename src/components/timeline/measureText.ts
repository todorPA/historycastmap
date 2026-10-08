import { useEffect, useState } from 'react';
import type { Measure } from '../../lib/timelineLayout';

/**
 * Label widths for lane packing, measured once per string on a canvas in the labels' own font
 * (13 px IBM Plex Sans, 500; 700 for the selection — HANDOFF §12.4).
 */
const cache = new Map<string, number>();
let ctx: CanvasRenderingContext2D | null = null;

export const measureLabel: Measure = (text, bold) => {
  const key = (bold ? 'b' : 'r') + text;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return text.length * 7;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 7;
  ctx.font = `${bold ? 700 : 500} 13px "IBM Plex Sans", system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width);
  cache.set(key, w);
  return w;
};

/**
 * Widths measured before the web font arrives are the fallback font's, so lanes would pack
 * against the wrong text. Bumps once the fonts are ready, which re-lays the rows.
 */
export function useFontsReady(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (!live) return;
      cache.clear();
      setVersion((v) => v + 1);
    });
    return () => {
      live = false;
    };
  }, []);
  return version;
}
