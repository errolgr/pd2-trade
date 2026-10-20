// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { hasLooseLinks, pillNodes, renderDraft, selectionOffsets, serializeEditor, setCaret } from './draft-editor';

const A = 'https://www.projectdiablo2.com/market/listing/aa11?display="<b>Shako</b>"';
const B = 'https://projectdiablo2.com/market/listing/bb22';

function editor() {
  const el = document.createElement('div');
  el.contentEditable = 'true';
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('draft editor', () => {
  it('renders links as atomic pill nodes and serializes back to the same draft', () => {
    const el = editor();
    for (const draft of ['', 'hi', `${A}`, `wts ${A} or ${B}\nfor 2 ist`, `two lines\n`, `${A}${B}`]) {
      renderDraft(el, draft);
      expect(serializeEditor(el)).toBe(draft);
    }
    renderDraft(el, `wts ${A} ok`);
    const [pill] = pillNodes(el);
    expect(pill.getAttribute('contenteditable')).toBe('false');
    // Hostile names stay attribute text: no markup is built from them
    expect(el.querySelector('b')).toBeNull();
    expect(hasLooseLinks(el)).toBe(false);
  });

  it('notices a listing URL typed into a text node', () => {
    const el = editor();
    renderDraft(el, 'look ');
    el.append(document.createTextNode(B));
    expect(hasLooseLinks(el)).toBe(true);
  });

  it('maps carets between draft offsets and the DOM, landing after a pill for offsets inside it', () => {
    const el = editor();
    el.tabIndex = 0;
    const draft = `wts ${A} ok`;
    renderDraft(el, draft);
    el.focus();
    for (const offset of [0, 2, 4, 4 + A.length, draft.length]) {
      setCaret(el, offset);
      expect(selectionOffsets(el)).toEqual([offset, offset]);
    }
    setCaret(el, 10);
    expect(selectionOffsets(el)).toEqual([4 + A.length, 4 + A.length]);
  });
});
