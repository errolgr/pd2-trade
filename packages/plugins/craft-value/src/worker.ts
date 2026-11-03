import { sdk } from '@pd2-trader/plugin-sdk';
import { craftBadge, craftSection, runeTable, type RuneTable } from './craft';

const REFRESH_MS = 10 * 60 * 1000;

// Slot handlers answer from this table only: the host gives them 300 ms, so they never fetch.
let table: RuneTable = new Map();

async function refresh(): Promise<void> {
  try {
    table = runeTable(await sdk.prices.runes());
  } catch (error) {
    sdk.log('Rune prices unavailable:', error instanceof Error ? error.message : String(error));
  }
}

void refresh();
setInterval(() => void refresh(), REFRESH_MS);

sdk.slots.register('priceCheck.section', (input) => craftSection(input, table));
sdk.slots.register('priceCheck.badge', (input) => craftBadge(input, table));
