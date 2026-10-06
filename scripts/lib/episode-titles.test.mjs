import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { displayTitle, parseEpisodeNumber, seriesOfTitle, slugify, stripBranding } from './episode-titles.mjs';

describe('parseEpisodeNumber', () => {
  it('reads the number leading the title, whatever the separator', () => {
    expect(parseEpisodeNumber('149 - Prvi srpski kralj')).toEqual({ number: '149', rest: 'Prvi srpski kralj' });
    // Each of these broke an earlier regex in turn.
    expect(parseEpisodeNumber('115 = Vuk Karadžić | HistoryCast nedeljom')?.number).toBe('115');
    expect(parseEpisodeNumber('75. - Stefan Prvovenčani')?.number).toBe('75');
    expect(parseEpisodeNumber('61 Srpska puška - od ustanika')).toEqual({
      number: '61',
      rest: 'Srpska puška - od ustanika',
    });
  });

  it('accepts non-ASCII dashes as separators', () => {
    expect(parseEpisodeNumber('12 – Pobeda ili primirje?')?.rest).toBe('Pobeda ili primirje?');
    expect(parseEpisodeNumber('12 — Pobeda ili primirje?')?.rest).toBe('Pobeda ili primirje?');
  });

  it('normalises leading zeros, so 05.json and 5.json find the same episode', () => {
    expect(parseEpisodeNumber('05 - Istorija lala')?.number).toBe('5');
  });

  it('does not take a digit from later in the title as the episode number', () => {
    expect(parseEpisodeNumber('Drugi svetski rat, 1941 - Bitka za Moskvu')).toBeNull();
    expect(parseEpisodeNumber('Novogodišnja epizoda')).toBeNull();
    expect(parseEpisodeNumber('')).toBeNull();
  });
});

describe('seriesOfTitle', () => {
  it('puts the četvrtkom and nedeljom slots in the side series', () => {
    expect(seriesOfTitle('HistoryCast četvrtkom - Žiča')).toBe('side');
    expect(seriesOfTitle('Karavađo | HistoryCast Nedeljom')).toBe('side');
    // Without the diacritic, as the feed sometimes spells it.
    expect(seriesOfTitle('Beogradske kafane - HistoryCast cetvrtkom')).toBe('side');
  });

  // The design decision: when numbering and branding disagree, branding wins.
  it('lets branding win over numbering', () => {
    expect(seriesOfTitle('115 = Vuk Karadžić | HistoryCast nedeljom')).toBe('side');
  });

  it('keeps specials and unbranded one-offs in the main show', () => {
    expect(seriesOfTitle('95 - Kosovska bitka, HistoryCast specijal')).toBe('main');
    expect(seriesOfTitle('Novogodišnja epizoda')).toBe('main');
    expect(seriesOfTitle('149 - Prvi srpski kralj')).toBe('main');
  });
});

describe('stripBranding', () => {
  it('removes a leading brand', () => {
    expect(stripBranding('HistoryCast četvrtkom - Žiča')).toBe('Žiča');
    expect(stripBranding('HistoryCast nedeljom - Karađorđe posle Karađorđa')).toBe('Karađorđe posle Karađorđa');
  });

  it('removes a trailing brand after a pipe, dash or comma', () => {
    expect(stripBranding('Vuk Karadžić | HistoryCast nedeljom')).toBe('Vuk Karadžić');
    expect(stripBranding('Partenon - HistoryCast nedeljom')).toBe('Partenon');
    expect(stripBranding('Žene antičkog Balkana, HistoryCast nedeljom')).toBe('Žene antičkog Balkana');
  });

  it('keeps separators that belong to the title itself', () => {
    expect(stripBranding('Gotika - vreme katedrala, HistoryCast nedeljom')).toBe('Gotika - vreme katedrala');
    expect(stripBranding('Beogradski grand prix, 1939 | HistoryCast nedeljom')).toBe('Beogradski grand prix, 1939');
  });

  it('leaves non-side-series branding alone', () => {
    expect(stripBranding('Kosovska bitka, HistoryCast specijal')).toBe('Kosovska bitka, HistoryCast specijal');
  });

  it('keeps the original when the title is nothing but the brand', () => {
    expect(stripBranding('HistoryCast nedeljom')).toBe('HistoryCast nedeljom');
  });
});

describe('displayTitle', () => {
  // The four episodes whose numbers collide (05, 06) are found by slug, and that path used to
  // keep the number: "06 Aleksandar Makedonski" in the list, beside "Peloponeski rat".
  it('drops the leading episode number, whichever lookup finds the episode', () => {
    expect(displayTitle('06 Aleksandar Makedonski')).toBe('Aleksandar Makedonski');
    expect(displayTitle('06 - Uroš Predić')).toBe('Uroš Predić');
    expect(displayTitle('149 - Prvi srpski kralj')).toBe('Prvi srpski kralj');
  });

  it('drops the number and the side-series brand together', () => {
    expect(displayTitle('05 - Istorija lala | HistoryCast četvrtkom')).toBe('Istorija lala');
    expect(displayTitle('HistoryCast četvrtkom - Žiča')).toBe('Žiča');
  });

  it('leaves a title alone when its digits are not an episode number', () => {
    expect(displayTitle('Drugi svetski rat, 1941 - Bitka za Moskvu')).toBe('Drugi svetski rat, 1941 - Bitka za Moskvu');
    expect(displayTitle('Novogodišnja epizoda')).toBe('Novogodišnja epizoda');
  });
});

describe('slugify', () => {
  // đ is a letter with a stroke, not a base letter plus a combining mark, so NFD cannot
  // decompose it. Without the explicit rule it collapsed to "-": "kara-or-e".
  it('spells đ as dj', () => {
    expect(slugify('Karađorđe posle Karađorđa')).toBe('karadjordje-posle-karadjordja');
    expect(slugify('Karavađo')).toBe('karavadjo');
    expect(slugify('Ubistvo Kenedija između stvarnosti')).toBe('ubistvo-kenedija-izmedju-stvarnosti');
  });

  it('handles the capital Đ as well', () => {
    expect(slugify('Đurađ Branković')).toBe('djuradj-brankovic');
  });

  it('strips the combining diacritics', () => {
    expect(slugify('Čačak, Ćuprija, Šabac, Žiča')).toBe('cacak-cuprija-sabac-zica');
  });

  it('collapses punctuation and trims the edges', () => {
    expect(slugify('  SPECIJAL - Istorija sukoba: Izrael i Iran! ')).toBe('specijal-istorija-sukoba-izrael-i-iran');
  });
});

describe('against the real feed', () => {
  const feed = JSON.parse(readFileSync(new URL('../../episodes.json', import.meta.url), 'utf8'));

  it('gives every feed title a distinct slug', () => {
    const slugs = feed.map((e) => slugify(e.title));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('leaves no brand in any side-series display title', () => {
    const side = feed.filter((e) => seriesOfTitle(e.title) === 'side');
    expect(side.length).toBeGreaterThan(0);
    for (const e of side) {
      const shown = stripBranding(parseEpisodeNumber(e.title)?.rest || e.title);
      expect(shown, e.title).not.toMatch(/HistoryCast\s+(nedeljom|[čc]etvrtkom)/i);
      expect(shown, e.title).not.toBe('');
    }
  });
});
