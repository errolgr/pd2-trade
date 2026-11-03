import { sdk, ui, type InlineNode } from '@pd2-trader/plugin-sdk';
import {
  changePercent,
  highRunes,
  priceMap,
  samePrices,
  trendOf,
  type PanelRequest,
  type PriceMap,
  type TickerSnapshot,
} from './ticker';

const REFRESH_MS = 5 * 60 * 1000;
const STORE_KEY = 'prices';

type Stored = { last: PriceMap; previous: PriceMap | null };

let stored: Stored | null = null;
let snapshot: TickerSnapshot | null = null;

const post = () => {
  // Only reaches an open panel; a closed one is not an error.
  if (snapshot) sdk.panels.post('main', snapshot).catch(() => {});
};

async function refresh(): Promise<void> {
  try {
    const runes = highRunes(await sdk.prices.runes());
    const current = priceMap(runes);
    // The trend baseline moves only when prices actually change, so the trend survives unchanged fetches.
    const previous = stored && !samePrices(stored.last, current) ? stored.last : (stored?.previous ?? null);
    stored = { last: current, previous };
    snapshot = { type: 'snapshot', at: new Date().toISOString(), runes, previous };
    post();
    await sdk.storage.set(STORE_KEY, stored);
  } catch (error) {
    sdk.log('Rune refresh failed:', error instanceof Error ? error.message : String(error));
  }
}

async function start(): Promise<void> {
  try {
    const saved = await sdk.storage.get<Stored>(STORE_KEY);
    if (saved && typeof saved === 'object' && saved.last) stored = saved;
  } catch {
    // No storage yet: the first fetch becomes the baseline.
  }
  await refresh();
}

void start();
setInterval(() => void refresh(), REFRESH_MS);

sdk.slots.register('ticker.widget', () => {
  if (!snapshot) return null;
  const { runes, previous } = snapshot;
  const shown = ['Ber', 'Jah'].flatMap((name) => runes.filter((r) => r.name === name));
  if (!shown.length) return null;
  const nodes: InlineNode[] = [ui.text(shown.map((r) => r.name).join(' · '), { tone: 'q-rune', size: 'sm' })];
  for (const rune of shown)
    nodes.push(ui.price(rune.priceHr, 'hr', trendOf(changePercent(rune.name, rune.priceHr, previous))));
  return nodes;
});

sdk.panels.onMessage((panel, data) => {
  if (panel !== 'main') return;
  const request = data as PanelRequest | null;
  if (request?.type === 'refresh') void refresh();
  else if (request?.type === 'sync') post();
});

sdk.commands.register('open', () => sdk.panels.open('main'));
