import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { glyphCodeForName } from '@/lib/glyph-code';
import { TombGlyph } from './TombGlyph';

// sha256 of pd2trader.com's TombGlyph.jsx markup (renderToStaticMarkup, size 32) for these names.
const WEBSITE_MARKUP: [string, string][] = [
  ['errolgr', '1905abaf64c7792f305bc2e80404738d6231df6e842d2b7c5fd32faacabfa6fe'],
  ['pd2trader', '7d9f4b1ded72b38fc888c8e00ab8c22efc043dcac087372723bcacdebd249a4f'],
  ['Unknown', 'd3831250dae00dc14e679c69ec9b9ba06a0fe9c130ae50852ca2e015a342d32f'],
  ['Ößé名前', 'a909c62e25fc3240d3d39375a6a944e3415554be44f1927bbe3ba2e6b2e1e346'],
  ['?', '1c3f81d42fbf94308a7a1bb8694e59eefa013920cd73b5ef0a5e434c2d427e6c'],
  ['SomeTrader', 'a6f0de1a93cacc15f22c1d914b0b608c61bff721773a6eaf1fa887be5b042c6d'],
];

describe('TombGlyph', () => {
  it.each(WEBSITE_MARKUP)('draws %s exactly as the website does', (name, sha) => {
    const html = renderToStaticMarkup(<TombGlyph code={glyphCodeForName(name)}
      size={32} />);
    expect(createHash('sha256').update(html).digest('hex')).toBe(sha);
  });

  it('draws the bare tile for an invalid code', () => {
    const html = renderToStaticMarkup(<TombGlyph code={-1n} />);
    expect(html).toContain('fill="#2a2520"');
    expect(html).not.toContain('stroke="currentColor"');
  });
});
