/**
 * What the badge shows for an episode.
 *
 * The badge is the episode *number*, and 39 of 178 episodes have none — their id is the slug
 * of the title, because they are side-series or specials the feed never numbered. Rendering the
 * raw id put `historycast-nedeljom-karadjordje-posle-karadjordja` in a 26px box.
 *
 * Leading digits are used where they exist (`05-istorija-lala-…` → `05`), since that is a real
 * episode number that merely lost its numeric id to a collision. Otherwise the badge says only
 * that there is no number; the title beside it is the identity, and the full id is on the
 * element's title attribute for anyone who needs it.
 */
export function episodeBadge(id: string): string {
  const leading = /^(\d+)/.exec(id);
  return leading ? leading[1] : '·';
}
