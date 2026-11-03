import {
  ui,
  type MarketRow,
  type NetWorthSummary,
  type RunePrice,
  type Tone,
  type UiNode,
} from '@pd2-trader/plugin-sdk';

/**
 * Pure logic of Market Insights: everything a slot answers is computed from the slot input (and the rune table the
 * worker keeps in memory), so handlers never wait on the network.
 */

/** Rows priced below this share of the median count as deals (and above 1 / it as expensive). */
export const DEAL_RATIO = 0.85;

const priced = (rows: MarketRow[]) => rows.filter((r): r is MarketRow & { priceHr: number } => (r.priceHr ?? 0) > 0);

/** Median HR price of the priced rows; null with fewer than 3 (too few to compare against). */
export function medianHr(rows: MarketRow[]): number | null {
  const prices = priced(rows)
    .map((r) => r.priceHr)
    .sort((a, b) => a - b);
  if (prices.length < 3) return null;
  const mid = prices.length >> 1;
  return prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
}

/** Signed percent vs the median, e.g. -23 for a row 23% under it. */
export const vsMedianPercent = (priceHr: number, median: number) => Math.round(((priceHr - median) / median) * 100);

function toneOf(percent: number): Tone {
  if (percent <= -(1 - DEAL_RATIO) * 100) return 'success';
  if (percent >= (1 / DEAL_RATIO - 1) * 100) return 'warning';
  return 'muted';
}

export const formatPercent = (percent: number) =>
  percent > 0 ? `+${percent}%` : percent === 0 ? '±0%' : `${percent}%`;

/** `market.column`: each priced row's distance from the median of the results. */
export function medianColumn(rows: MarketRow[]) {
  const median = medianHr(rows);
  if (median === null) return null;
  const cells: Record<string, { text: string; tone: Tone }> = {};
  for (const row of priced(rows)) {
    const percent = vsMedianPercent(row.priceHr, median);
    cells[row.id] = { text: formatPercent(percent), tone: toneOf(percent) };
  }
  return { title: 'vs median', cells };
}

/** `market.filter`: rows at least 15% under the median. */
export function dealsFilter(rows: MarketRow[]) {
  const median = medianHr(rows);
  if (median === null) return null;
  return {
    label: 'Under median',
    keep: priced(rows)
      .filter((r) => r.priceHr <= median * DEAL_RATIO)
      .map((r) => r.id),
  };
}

/** `market.sort`: cheapest relative to the median first; online sellers break ties ahead of offline ones. */
export function dealSort(rows: MarketRow[]) {
  const median = medianHr(rows);
  if (median === null) return null;
  const scores: Record<string, number> = {};
  for (const row of priced(rows)) scores[row.id] = median / row.priceHr + (row.online ? 0.001 : 0);
  return { label: 'Best deal', scores };
}

/** High rune name → HR price, from `sdk.prices.runes()`. */
export type RuneTable = Map<string, number>;

export function runeTable(prices: RunePrice[]): RuneTable {
  return new Map(prices.filter((p) => p.priceHr > 0).map((p) => [p.name.replace(/\s*rune$/i, '').trim(), p.priceHr]));
}

/** `1.25 HR` as `≈ 0.4 Ber` (in the given rune); null without its price. */
export function inRune(hr: number, rune: string, table: RuneTable): string | null {
  const price = table.get(rune);
  if (!price) return null;
  const amount = hr / price;
  return `≈ ${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${rune}`;
}

/** Category ids arrive lowercase (`runes`, `uniques`). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const formatHr = (hr: number) => `${hr >= 10 ? hr.toFixed(0) : hr.toFixed(2)} HR`;

/** The text of the `compare` row action: the listing against the core market median. */
export function compareMessage(row: MarketRow, marketMedianHr: number | null): string {
  if (row.priceHr === null) return `${row.name}: no HR price on this listing.`;
  if (!marketMedianHr) return `${row.name} at ${formatHr(row.priceHr)}: no market median yet.`;
  const percent = vsMedianPercent(row.priceHr, marketMedianHr);
  return `${row.name} at ${formatHr(row.priceHr)} is ${formatPercent(percent)} vs the market median of ${formatHr(marketMedianHr)}.`;
}

/** `networth.metric`: the total in Ber. */
export function berMetric(summary: NetWorthSummary, table: RuneTable) {
  const text = inRune(summary.totalHr, 'Ber', table);
  return text ? { label: 'In Ber', value: ui.text(text, { tone: 'q-rune' }) } : null;
}

/** `networth.tab`: where the value sits (category shares, top lines) and how much of it is uncertain. */
export function insightsTab(summary: NetWorthSummary, table: RuneTable) {
  if (summary.totalHr <= 0) return null;
  const share = (hr: number) => `${Math.round((hr / summary.totalHr) * 100)}%`;
  const categories = Object.entries(summary.byCategory)
    .filter(([, hr]) => hr > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const content: UiNode[] = [
    ui.section('Breakdown', [
      ...categories.map(([category, hr]) => ui.row(capitalize(category), `${formatHr(hr)} · ${share(hr)}`)),
      ui.divider(),
      ui.row(
        'Uncertain value',
        share(summary.uncertainHr),
        summary.uncertainHr / summary.totalHr > 0.25 ? 'warning' : 'muted',
      ),
    ]),
  ];
  if (summary.topLines.length) {
    content.push(
      ui.section(
        'Top holdings',
        summary.topLines
          .slice(0, 5)
          .map((line) =>
            ui.row(
              line.qty > 1 ? `${line.name} ×${line.qty}` : line.name,
              inRune(line.valueHr, 'Ber', table) ?? formatHr(line.valueHr),
            ),
          ),
      ),
    );
  }
  return { title: 'Insights', content };
}
