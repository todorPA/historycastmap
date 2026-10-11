/** "66:38" → 3998 seconds. Accepts MM:SS or HH:MM:SS. */
export function timestampToSeconds(ts: string): number {
  const parts = ts.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.length === 2
    ? parts[0] * 60 + parts[1]
    : parts[0] * 3600 + parts[1] * 60 + parts[2];
}
