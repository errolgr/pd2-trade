import { describe, expect, it } from 'vitest';
import { joinDraft, splitDraft } from './market-links';

const A = 'https://www.projectdiablo2.com/market/listing/aa11?display="Shako"';
const B = 'https://projectdiablo2.com/market/listing/bb22';

describe('composer drafts', () => {
  it('splits the typed text from attached listing links and joins them back unchanged', () => {
    for (const text of ['', 'hi', 'hi ', 'two\nlines ']) {
      const draft = joinDraft(text, [A, B]);
      const split = splitDraft(draft);
      expect(split.text).toBe(text);
      expect(split.links.map((link) => link.url)).toEqual([A, B]);
      expect(
        joinDraft(
          split.text,
          split.links.map((link) => link.url),
        ),
      ).toBe(draft);
    }
    expect(joinDraft('hi', [])).toBe('hi');
  });

  it('cuts a link out of the middle of the text with the space before it', () => {
    const { text, links } = splitDraft(`look ${A} here`);
    expect(text).toBe('look here');
    expect(links.map((link) => link.listingId)).toEqual(['aa11']);
  });
});
