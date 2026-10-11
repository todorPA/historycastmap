import { describe, expect, it } from 'vitest';
import { fillPlaceholders, fillStrings } from './fillStrings';

describe('fillStrings', () => {
  it('fills empty keyed elements, inline markup in the string included', () => {
    const { html, missing } = fillStrings('<h1 class="x" data-i="a"></h1><p data-i="b"></p>', { a: 'Svaka <em>epizoda</em>', b: 'Tekst' });
    expect(html).toBe('<h1 class="x" data-i="a">Svaka <em>epizoda</em></h1><p data-i="b">Tekst</p>');
    expect(missing).toEqual([]);
  });

  it('leaves non-empty elements alone, and reports unknown keys', () => {
    const { html, missing } = fillStrings('<span data-i="a">kept</span><span data-i="zz"></span>', { a: 'new' });
    expect(html).toBe('<span data-i="a">kept</span><span data-i="zz"></span>');
    expect(missing).toEqual(['zz']);
  });

  it('does not confuse similar attributes', () => {
    expect(fillStrings('<img data-img="a"><b data-i="a"></b>', { a: 'x' }).html).toBe('<img data-img="a"><b data-i="a">x</b>');
  });
});

describe('fillPlaceholders', () => {
  it('fills attribute placeholders, escaped for an attribute', () => {
    const { html, missing } = fillPlaceholders('<img alt="%%a%%"><title>%%b%%</title><x y="%%zz%%">', { a: 'Mapa: "Vikinzi" & <b>', b: 'Naslov' });
    expect(html).toBe('<img alt="Mapa: &quot;Vikinzi&quot; &amp; &lt;b>"><title>Naslov</title><x y="%%zz%%">');
    expect(missing).toEqual(['zz']);
  });
});
