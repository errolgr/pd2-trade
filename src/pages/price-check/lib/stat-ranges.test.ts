import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Item } from './interfaces';
import { tooltipLines } from './tooltip-lines';

/**
 * Ground truth from the live S14 client (bh-harness, BH "always show stat ranges" on): per item, BH's Ctrl+C
 * JSON and the hover tooltip lines exactly as drawn. Re-capture each season with the pd2-trade-oracle
 * scripts, after regenerating src/assets/stat-ranges.data.ts from the same game data.
 */
const ORACLE = readFileSync(path.join(__dirname, '__fixtures__/stat-ranges-oracle.s14.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line) as { clipboard: Item; tooltip: string[] });

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Game tooltip line → its bracketed range (null when the line has none), keyed by normalized text. */
function gameRanges(tooltip: string[]): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const line of tooltip) {
    const m = /^(.*?)\s*(\[[^\]]*\])\s*$/.exec(line);
    out.set(norm(m ? m[1] : line), m ? m[2] : null);
  }
  return out;
}

describe('stat ranges match the PD2 tooltip (S14 client capture)', () => {
  it('draws the same range as the game on every line both show', () => {
    const mismatches: string[] = [];
    let compared = 0;
    for (const { clipboard, tooltip } of ORACLE) {
      const game = gameRanges(tooltip);
      for (const line of tooltipLines(clipboard).stats) {
        const key = norm(line.text);
        if (!game.has(key)) continue; // the clipboard value differs from the drawn one (per-level, set bonus)
        compared++;
        const expected = game.get(key) ?? null;
        if ((line.range ?? null) !== expected) {
          mismatches.push(
            `${clipboard.name ?? clipboard.runeword}: ${line.text} → ${line.range ?? 'none'}, game ${expected ?? 'none'}`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
    // 436 lines pair up with the game's today; far fewer means our line wording drifted from the game's.
    expect(compared).toBeGreaterThan(400);
  });
});
