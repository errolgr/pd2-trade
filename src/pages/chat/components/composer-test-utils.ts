/**
 * Test helpers driving the composer's contentEditable editor the way a browser would: text lands in text
 * nodes at the caret, then an input event fires. Only imported by tests.
 */
import { fireEvent } from '@testing-library/react';

/** Puts the caret at `offset` of `node` (a text node, or a child index of an element). */
export function placeCaret(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const selection = document.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Replaces everything in the editor with typed `text`, the caret at `caret` (default: the end). */
export function typeDraft(editor: HTMLElement, text: string, caret = text.length) {
  editor.focus();
  const node = document.createTextNode(text);
  editor.replaceChildren(...(text ? [node] : []));
  if (text) placeCaret(node, caret);
  else placeCaret(editor, 0);
  fireEvent.input(editor);
}

/** Types `text` at the caret: into the text node there, or as a new text node between pills. */
export function typeAtCaret(editor: HTMLElement, text: string) {
  editor.focus();
  const range = document.getSelection()!.getRangeAt(0);
  const { startContainer, startOffset } = range;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    (startContainer as Text).insertData(startOffset, text);
    placeCaret(startContainer, startOffset + text.length);
  } else {
    const node = document.createTextNode(text);
    startContainer.insertBefore(node, startContainer.childNodes[startOffset] ?? null);
    placeCaret(node, text.length);
  }
  fireEvent.input(editor);
}

/** Pastes plain `text` at the caret. */
export function pasteText(editor: HTMLElement, text: string) {
  fireEvent.paste(editor, { clipboardData: { getData: (type: string) => (type === 'text/plain' ? text : '') } });
}
