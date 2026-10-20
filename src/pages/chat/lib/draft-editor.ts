/**
 * The composer's inline editor: a contentEditable element holding plain text nodes and, for each listing
 * link, an atomic pill node (`contenteditable=false`, `data-url`) that React renders the item pill into.
 * The draft string (text with the links' URLs in place) is the source of truth; these helpers turn one into
 * the other and map carets between them. Nodes are only ever built with createElement/createTextNode.
 */
import { findMarketLinks } from './market-links';

/** Marks a pill node; its value is the link's URL. */
const URL_ATTR = 'data-url';
/** A unique key per pill node (React portal key). */
const KEY_ATTR = 'data-pill-key';

let pillSeq = 0;

const isPill = (node: Node): node is HTMLElement => node instanceof HTMLElement && node.hasAttribute(URL_ATTR);
const isBlock = (node: Node) => node instanceof HTMLElement && (node.tagName === 'DIV' || node.tagName === 'P');

/** The pill nodes of the editor, in document order. */
export const pillNodes = (editor: HTMLElement) => Array.from(editor.querySelectorAll<HTMLElement>(`[${URL_ATTR}]`));

/** A pill node's link URL and React key. */
export const pillInfo = (node: HTMLElement) => ({
  url: node.getAttribute(URL_ATTR) ?? '',
  key: node.getAttribute(KEY_ATTR) ?? '',
});

/** Replaces the editor's content with the draft: text nodes, and a pill node per listing link. */
export function renderDraft(editor: HTMLElement, draft: string): void {
  const doc = editor.ownerDocument;
  const nodes: Node[] = [];
  let last = 0;
  for (const link of findMarketLinks(draft)) {
    if (link.start > last) nodes.push(doc.createTextNode(draft.slice(last, link.start)));
    const pill = doc.createElement('span');
    pill.contentEditable = 'false';
    pill.setAttribute(URL_ATTR, link.url);
    pill.setAttribute(KEY_ATTR, String(++pillSeq));
    pill.className = 'mx-1 inline-block align-middle';
    nodes.push(pill);
    last = link.end;
  }
  if (last < draft.length) nodes.push(doc.createTextNode(draft.slice(last)));
  // A trailing newline only shows as a line with something after it
  if (draft.endsWith('\n')) nodes.push(doc.createElement('br'));
  editor.replaceChildren(...nodes);
}

/** The length a node contributes to the draft (`root`: its last <br> only fills the line and counts 0). */
function serializeNode(node: Node, root: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (isPill(node)) return node.getAttribute(URL_ATTR) ?? '';
  if (node instanceof HTMLElement && node.tagName === 'BR') {
    return node.parentNode === root && node === root.lastChild ? '' : '\n';
  }
  let text = '';
  node.childNodes.forEach((child) => {
    // Browser-made line blocks start a new line
    if (isBlock(child) && child.previousSibling) text += '\n';
    text += serializeNode(child, root);
  });
  return text;
}

/** The draft the editor holds: its text, with each pill as its URL, in document order. */
export const serializeEditor = (editor: HTMLElement) => serializeNode(editor, editor);

/** Whether any text node holds a listing URL (typed or pasted) that should become a pill. */
export function hasLooseLinks(editor: HTMLElement): boolean {
  const walker = editor.ownerDocument.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (findMarketLinks(node.textContent ?? '').length > 0) return true;
  }
  return false;
}

/** The draft offset of a DOM position inside the editor (null when it is outside). */
function offsetOf(editor: HTMLElement, target: Node, targetOffset: number): number | null {
  let total = 0;
  let found = false;
  const walk = (node: Node): void => {
    if (found) return;
    if (node === target) {
      found = true;
      if (node.nodeType === Node.TEXT_NODE) total += targetOffset;
      else {
        const children = Array.from(node.childNodes).slice(0, targetOffset);
        for (const child of children) total += serializeNode(child, editor).length;
      }
      return;
    }
    if (node !== editor && (node.nodeType === Node.TEXT_NODE || isPill(node))) {
      total += serializeNode(node, editor).length;
      return;
    }
    if (node !== editor && node instanceof HTMLElement && node.tagName === 'BR') {
      total += serializeNode(node, editor).length;
      return;
    }
    node.childNodes.forEach((child) => {
      if (found) return;
      if (isBlock(child) && child.previousSibling) total += 1;
      walk(child);
    });
  };
  walk(editor);
  return found ? total : null;
}

/** The selection as draft offsets [start, end], or null when it is not in the editor. */
export function selectionOffsets(editor: HTMLElement): [number, number] | null {
  const selection = editor.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
  const start = offsetOf(editor, range.startContainer, range.startOffset);
  const end = offsetOf(editor, range.endContainer, range.endOffset);
  return start === null || end === null ? null : [start, end];
}

/**
 * Puts the caret at a draft offset of an editor `renderDraft` filled (flat: text, pills, a trailing <br>).
 * An offset inside a pill's URL lands after the pill.
 */
export function setCaret(editor: HTMLElement, offset: number): void {
  const doc = editor.ownerDocument;
  const range = doc.createRange();
  let rest = offset;
  let placed = false;
  const children = Array.from(editor.childNodes);
  for (let i = 0; i < children.length && !placed; i++) {
    const child = children[i];
    if (child.nodeType === Node.TEXT_NODE) {
      const length = child.textContent?.length ?? 0;
      if (rest <= length) {
        range.setStart(child, rest);
        placed = true;
      } else rest -= length;
    } else if (isPill(child)) {
      if (rest <= 0) {
        range.setStart(editor, i);
        placed = true;
      } else rest = Math.max(0, rest - serializeNode(child, editor).length);
    } else if (child === editor.lastChild) {
      // The trailing line filler: the caret goes before it
      range.setStart(editor, i);
      placed = true;
    } else rest -= serializeNode(child, editor).length;
  }
  if (!placed) range.setStart(editor, children.length);
  range.collapse(true);
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
