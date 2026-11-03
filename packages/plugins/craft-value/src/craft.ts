import { ui, type BadgeNode, type PriceCheckInput, type RunePrice, type SectionNode, type UiNode } from '@pd2-trader/plugin-sdk';
import { runewordRunes } from './runewords';

/** Rune prices keyed by short name ("Ber"), from sdk.prices.runes() ("Ber Rune"). */
export type RuneTable = Map<string, RunePrice>;

export const shortRuneName = (name: string): string => name.replace(/\s*rune$/i, '').trim();

export function runeTable(prices: RunePrice[]): RuneTable {
  return new Map(prices.map((p) => [shortRuneName(p.name), p]));
}

export const formatHr = (hr: number): string => `${hr >= 10 ? hr.toFixed(1) : hr.toFixed(2)} HR`;

export interface RuneCost {
  lines: { rune: string; count: number; totalHr: number | null }[];
  totalHr: number;
  missing: string[];
}

export function runeCost(runes: string[], table: RuneTable): RuneCost {
  const counts = new Map<string, number>();
  for (const rune of runes) counts.set(rune, (counts.get(rune) ?? 0) + 1);
  const lines: RuneCost['lines'] = [];
  const missing: string[] = [];
  let totalHr = 0;
  for (const [rune, count] of counts) {
    const price = table.get(rune);
    if (!price) missing.push(rune);
    const lineHr = price ? price.priceHr * count : null;
    totalHr += lineHr ?? 0;
    lines.push({ rune, count, totalHr: lineHr });
  }
  return { lines, totalHr, missing };
}

/** Within ±5% of the market price counts as even. */
export type Verdict = 'make' | 'buy' | 'even';
export function verdict(costHr: number, marketHr: number): Verdict {
  if (costHr < marketHr * 0.95) return 'make';
  if (costHr > marketHr * 1.05) return 'buy';
  return 'even';
}

/**
 * "≈ 1.4 Ber · 1.2 Jah": the price in the two most valuable runes worth at most the price (so cheap items read
 * "≈ 1.2 Mal", not "0.0 Zod"); below the cheapest priced rune, in that rune.
 */
export function runeEquivalents(hr: number, table: RuneTable, count = 2): string | null {
  const priced = [...table.values()].filter((p) => p.priceHr > 0).sort((a, b) => b.priceHr - a.priceHr);
  if (!priced.length || hr <= 0) return null;
  const affordable = priced.filter((p) => p.priceHr <= hr);
  const top = (affordable.length ? affordable : priced.slice(-1)).slice(0, count);
  const parts = top.map((p) => {
    const n = hr / p.priceHr;
    return `${n >= 10 ? n.toFixed(0) : n.toFixed(1)} ${shortRuneName(p.name)}`;
  });
  return `≈ ${parts.join(' · ')}`;
}

interface Analysis {
  cost: RuneCost | null;
  verdict: Verdict | null;
}

function analyze({ item, price }: PriceCheckInput, table: RuneTable): Analysis {
  const runes = item.isRuneword ? runewordRunes(item.name) : null;
  if (!runes || !table.size) return { cost: null, verdict: null };
  const cost = runeCost(runes, table);
  const market = price?.medianHr ?? null;
  return { cost, verdict: market !== null && market > 0 && !cost.missing.length ? verdict(cost.totalHr, market) : null };
}

const VERDICT_BADGE: Record<Verdict, BadgeNode> = {
  make: ui.badge('Cheaper to make', 'success'),
  buy: ui.badge('Cheaper to buy', 'warning'),
  even: ui.badge('About even', 'muted'),
};

/** priceCheck.section: rune cost breakdown for runewords, rune equivalents for any priced item. */
export function craftSection(input: PriceCheckInput, table: RuneTable): SectionNode | null {
  const children: UiNode[] = [];
  const { cost, verdict: result } = analyze(input, table);
  const market = input.price?.medianHr ?? null;
  if (cost) {
    for (const line of cost.lines) {
      const label = line.count > 1 ? `${line.rune} ×${line.count}` : line.rune;
      children.push(ui.row(label, line.totalHr === null ? '—' : formatHr(line.totalHr)));
    }
    children.push(ui.divider(), ui.row('Rune cost', formatHr(cost.totalHr)));
    if (cost.missing.length) children.push(ui.text(`No price for ${cost.missing.join(', ')}`, { tone: 'muted', size: 'sm' }));
    if (market !== null && market > 0) children.push(ui.row('Market price', formatHr(market)));
    if (result) children.push(VERDICT_BADGE[result]);
  }
  if (market !== null && market > 0) {
    const equivalents = runeEquivalents(market, table);
    if (equivalents) children.push(ui.row('In runes', equivalents));
  }
  return children.length ? ui.section('Craft value', children) : null;
}

/** priceCheck.badge: only when making the runeword is clearly cheaper or dearer than buying it. */
export function craftBadge(input: PriceCheckInput, table: RuneTable): BadgeNode | null {
  const { verdict: result } = analyze(input, table);
  if (result === 'make') return ui.badge('Craft ✓', 'success');
  if (result === 'buy') return ui.badge('Craft ✗', 'warning');
  return null;
}
