import { describe, expect, it } from 'vitest';
import {
  GLYPH_SPACE,
  GLYPH_VISIBLE_SPACE,
  decodeGlyph,
  encodeGlyph,
  glyphCodeAt,
  glyphCodeForName,
  isValidGlyphCode,
} from './glyph-code';

// Codes pd2trader.com's client/src/utils/glyph/glyphCode.js computes: a trader draws the same glyph on both.
const WEBSITE_CODES: [string, string][] = [
  ['errolgr', '1007654567379551960961091'],
  ['pd2trader', '159616680029078661873927891'],
  ['Unknown', '227097433153281433487672040'],
  ['Ößé名前', '192939661451553349840011334'],
  ['?', '71993754612792519888863427'],
  ['SomeTrader', '75616972864164046656114739'],
];

describe('glyphCodeForName', () => {
  it.each(WEBSITE_CODES)('%s matches the website', (name, code) => {
    expect(glyphCodeForName(name).toString()).toBe(code);
  });

  it('ignores case and surrounding space', () => {
    expect(glyphCodeForName('  ErrolGR ')).toBe(glyphCodeForName('errolgr'));
  });

  it('decodes to the website parts', () => {
    expect(decodeGlyph(glyphCodeForName('errolgr'))).toMatchObject({
      color: 'rare',
      shape: 'square',
      orientation: 'upright',
      spine: 'below',
      top: 'chevron',
      base: 'bar',
    });
  });
});

describe('glyph space', () => {
  it('has the website size', () => {
    expect(GLYPH_SPACE).toBe(10582679699324928000n);
    expect(GLYPH_VISIBLE_SPACE).toBe(6442040);
  });

  it('round-trips codes through decode and encode', () => {
    for (const index of [0n, 1n, 123456789n, GLYPH_SPACE / 3n, GLYPH_SPACE - 1n]) {
      const code = glyphCodeAt(index);
      expect(isValidGlyphCode(code)).toBe(true);
      expect(encodeGlyph(decodeGlyph(code))).toBe(code);
    }
  });

  it('rejects codes outside the layout or with clashing parts', () => {
    expect(isValidGlyphCode(-1n)).toBe(false);
    expect(isValidGlyphCode(1n << 200n)).toBe(false);
    expect(isValidGlyphCode(Number.MAX_VALUE)).toBe(false);
    // A mirrored circle draws the same picture as an upright one
    expect(() => encodeGlyph({ ...decodeGlyph(glyphCodeAt(0n)), shape: 'circle', orientation: 'mirrored' })).toThrow(
      RangeError,
    );
  });
});
