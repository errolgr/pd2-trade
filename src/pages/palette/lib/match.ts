/**
 * How well `text` matches the typed `query`, case-insensitively: 4 equal, 3 starts with it, 2 a word starts with it,
 * 1 contains it, 0 no match. `query` must already be trimmed.
 */
export function matchTier(text: string, query: string): number {
  if (!query) return 0;
  const hay = text.toLowerCase();
  const q = query.toLowerCase();
  if (hay === q) return 4;
  if (hay.startsWith(q)) return 3;
  const at = hay.indexOf(q);
  if (at < 0) return 0;
  // A word start: after a space, hyphen, slash, parenthesis, apostrophe or dot
  for (let i = at; i >= 0; i = hay.indexOf(q, i + 1)) {
    if (/[\s\-/(.']/.test(hay[i - 1])) return 2;
  }
  return 1;
}

/** Best tier over several texts (a label and its keywords). */
export function bestTier(texts: readonly string[], query: string): number {
  let best = 0;
  for (const text of texts) best = Math.max(best, matchTier(text, query));
  return best;
}
