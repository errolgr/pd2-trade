import { sdk, ui, type RunePrice } from '@pd2-trader/plugin-sdk';

const REFRESH_MS = 10 * 60 * 1000;

// Slot handlers must answer from memory: the host waits 300 ms, then shows an error chip and counts a failure.
// Load data at startup and on a timer, never inside a handler.
let runes: RunePrice[] = [];

async function refresh(): Promise<void> {
  try {
    runes = (await sdk.prices.runes()).filter((r) => r.priceHr > 0).sort((a, b) => b.priceHr - a.priceHr);
  } catch (error) {
    sdk.log('Rune prices unavailable:', error instanceof Error ? error.message : String(error));
  }
}

void refresh();
setInterval(() => void refresh(), REFRESH_MS);

// Rendered under the core price-check result. Return null to render nothing for this item.
sdk.slots.register('priceCheck.section', ({ item, price }) => {
  const hr = price?.medianHr;
  const top = runes[0];
  if (!hr || !top) return null;
  const rune = top.name.replace(/\s*rune$/i, '');
  return ui.section('__PLUGIN_NAME__', [
    ui.row('Market price', `${hr.toFixed(2)} HR`),
    ui.row(`In ${rune}`, `≈ ${(hr / top.priceHr).toFixed(1)}`),
    ui.button('Show runes', 'open', { item: item.name }),
  ]);
});

// Commands appear in the command palette, can get a hotkey, and run when a slot button is clicked.
sdk.commands.register('open', (args) => sdk.panels.open('main', args ?? null));
