import type { Lang } from '../types/events';
import { t } from './i18n';
import { chronological } from './panelModel';
import { overlaps } from './episodeVisibility';
import type { EpisodeKind, EpisodeView } from './episodeModel';

/**
 * The previous and next episode in chronological order, among the matching set (HANDOFF §10.2
 * *Mesto u istoriji*, and ←/→ in §10.1). The selected episode need not be in that set — a filter
 * may exclude it while it stays selected (§6.5) — so its place is found by order, not by index.
 */
export function neighbours(selected: EpisodeView, matching: EpisodeView[]): { prev: EpisodeView | null; next: EpisodeView | null } {
  const sorted = matching.filter((e) => e.id !== selected.id).sort(chronological);
  const after = sorted.findIndex((e) => chronological(e, selected) > 0);
  const nextAt = after === -1 ? sorted.length : after;
  return { prev: sorted[nextAt - 1] ?? null, next: sorted[nextAt] ?? null };
}

/**
 * Episodes running at the same time (§10.2 *U isto vreme*): every other matching episode whose
 * period overlaps the selected one, other regions first — what was happening elsewhere is the
 * point of the section — then the closest in time.
 */
export function sameTime(selected: EpisodeView, matching: EpisodeView[], limit = 5): { shown: EpisodeView[]; more: number } {
  const family = selected.family?.id;
  const all = matching
    .filter((e) => e.id !== selected.id && overlaps(e.from, e.to, selected))
    .sort(
      (a, b) =>
        Number(a.family?.id === family) - Number(b.family?.id === family) ||
        Math.abs(a.anchor - selected.anchor) - Math.abs(b.anchor - selected.anchor) ||
        chronological(a, b),
    );
  return { shown: all.slice(0, limit), more: Math.max(0, all.length - limit) };
}

const MONTHS: Record<Lang, string[]> = {
  sr: ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** "objavljena jul 2026" from the feed's RFC 2822 date, read in UTC as the feed writes it. */
export function publishedLabel(pubDate: string | undefined, lang: Lang): string {
  const d = pubDate ? new Date(pubDate) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${t(lang, 'published')} ${MONTHS[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * A YouTube search for the episode: the data has no video ids (§10.2). Titles are searched in
 * Serbian, the language the videos are published in.
 */
export function youtubeSearchUrl(ep: EpisodeView): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`HistoryCast ${ep.title.sr}`)}`;
}

/** "period" / "jedan datum" / "dug period" — the card's date type (§10.2). */
export function kindLabel(kind: EpisodeKind, lang: Lang): string {
  return t(lang, kind === 'point' ? 'kindPoint' : kind === 'long' ? 'kindLong' : 'kindRange');
}

/** 2278 → "37:58"; past an hour, 3725 → "1:02:05". */
export function mmss(seconds: number): string {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
