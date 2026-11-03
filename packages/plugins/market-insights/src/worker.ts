import { sdk, ui, type MarketRow } from '@pd2-trader/plugin-sdk';
import {
  berMetric,
  compareMessage,
  dealSort,
  dealsFilter,
  insightsTab,
  medianColumn,
  runeTable,
  type RuneTable,
} from './insights';

const REFRESH_MS = 10 * 60 * 1000;
/** Rows remembered for the row action (its command only gets the row id). */
const MAX_ROWS = 500;

// Slot handlers answer from memory only: the host gives them 300 ms, so they never fetch.
let table: RuneTable = new Map();
const rows = new Map<string, MarketRow>();

async function refresh(): Promise<void> {
  try {
    table = runeTable(await sdk.prices.runes());
  } catch (error) {
    sdk.log('Rune prices unavailable:', error instanceof Error ? error.message : String(error));
  }
}

void refresh();
setInterval(() => void refresh(), REFRESH_MS);

function remember(row: MarketRow) {
  rows.delete(row.id);
  rows.set(row.id, row);
  while (rows.size > MAX_ROWS) rows.delete(rows.keys().next().value!);
}

sdk.slots.register('market.column', ({ rows }) => medianColumn(rows));
sdk.slots.register('market.filter', ({ rows }) => dealsFilter(rows));
sdk.slots.register('market.sort', ({ rows }) => dealSort(rows));
sdk.slots.register('market.rowAction', ({ row }) => {
  remember(row);
  return row.priceHr === null ? [] : [ui.button('Compare', 'compare')];
});
sdk.slots.register('networth.tab', (summary) => insightsTab(summary, table));
sdk.slots.register('networth.metric', (summary) => berMetric(summary, table));

// The command has 5 s, so it may ask the core for the market median the slots could not wait for.
sdk.commands.register('compare', async (rowId) => {
  const row = typeof rowId === 'string' ? rows.get(rowId) : undefined;
  if (!row) {
    await sdk.notify({
      title: 'Market Insights',
      body: 'Open a market listing first, then use Compare on it.',
      tone: 'warning',
    });
    return;
  }
  const price = await sdk.prices.item(row.name);
  await sdk.notify({ title: 'Market Insights', body: compareMessage(row, price?.medianHr ?? null) });
});
