/** Combobox search: which options match a query, best first, and which parts of a label to highlight. */

/** The fields `searchOptions` reads. */
export interface SearchableOption {
  label: string;
  hint?: string;
  group?: string;
  keywords?: string;
}

// String(): plain-JS callers sometimes pass numbers as labels.
const norm = (s: string | undefined) => String(s ?? '').toLowerCase();
const WORD_CHAR = /[\p{L}\p{N}]/u;
const isWordStart = (text: string, i: number) => i === 0 || !WORD_CHAR.test(text[i - 1]);

/** The lower-cased, whitespace-separated words of `query`. */
export function queryWords(query: string): string[] {
  return norm(query).split(/\s+/).filter(Boolean);
}

/** Index of `word` in `text` (both lower case), preferring an occurrence at a word start; -1 when absent. */
function findWord(text: string, word: string): number {
  let first = -1;
  for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + 1)) {
    if (isWordStart(text, i)) return i;
    if (first < 0) first = i;
  }
  return first;
}

/**
 * How well `label` matches `words`: 0 when it starts with the first word and every word starts one of its words,
 * 1 when every word starts one of its words, 2 when it merely contains every word, 3 when it does not (the option
 * matched on its keywords or hint).
 */
export function labelRank(label: string, words: readonly string[]): 0 | 1 | 2 | 3 {
  const text = norm(label);
  let rank: 1 | 2 = 1;
  for (const w of words) {
    const i = findWord(text, w);
    if (i < 0) return 3;
    if (!isWordStart(text, i)) rank = 2;
  }
  return rank === 1 && words.length > 0 && text.startsWith(words[0]) ? 0 : rank;
}

/**
 * The options whose label, `keywords` or `hint` contains every word of `query`, best `labelRank` first, in
 * `options` order within a rank. Unless `flat`, options stay with their group (groups in first-appearance order),
 * so each group heading shows once. An empty query returns `options` itself.
 */
export function searchOptions<T extends SearchableOption>(
  options: readonly T[],
  query: string,
  { flat = false }: { flat?: boolean } = {},
): readonly T[] {
  const words = queryWords(query);
  if (!words.length) return options;
  const groupAt = new Map<string | undefined, number>();
  for (const o of options) if (!groupAt.has(o.group)) groupAt.set(o.group, groupAt.size);
  return options
    .filter((o) => {
      const hay = `${norm(o.label)} ${norm(o.keywords)} ${norm(o.hint)}`;
      return words.every((w) => hay.includes(w));
    })
    .map((o, i) => ({ o, i, rank: labelRank(o.label, words), group: flat ? 0 : (groupAt.get(o.group) ?? 0) }))
    .sort((a, b) => a.group - b.group || a.rank - b.rank || a.i - b.i)
    .map((x) => x.o);
}

/** `[start, end)` spans of `label` to highlight for `words` (one per word, at a word start when possible), merged. */
export function matchSpans(label: string, words: readonly string[]): Array<[number, number]> {
  const text = norm(label);
  const spans = words
    .map((w): [number, number] | null => {
      const i = findWord(text, w);
      return i < 0 ? null : [i, i + w.length];
    })
    .filter((s): s is [number, number] => s !== null)
    .sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [s, e] of spans) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}
