import { describe, expect, it } from 'vitest';
import { episodeBadge } from './episodes';

describe('episodeBadge', () => {
  it('shows the episode number', () => {
    expect(episodeBadge('149')).toBe('149');
    expect(episodeBadge('09')).toBe('09');
  });

  // Side-series episodes that collided on a number keep it as the slug's prefix.
  it('shows the leading number of a slug id', () => {
    expect(episodeBadge('05-istorija-lala-historycast-cetvrtkom')).toBe('05');
  });

  // The regression: a 51-character slug rendered into a 26px badge.
  it('never shows a slug, only a short mark', () => {
    expect(episodeBadge('historycast-nedeljom-karadjordje-posle-karadjordja')).toBe('·');
  });
});
