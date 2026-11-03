import type { RunePrice } from '@pd2-trader/plugin-sdk';

// Panels are plain DOM in a sandboxed frame: `window.pd2` is the bridge to the host, styling comes from the
// theme kit classes. Set text with textContent (never innerHTML with data).
const list = document.getElementById('runes') as HTMLElement;
const itemLabel = document.getElementById('item') as HTMLElement;
const status = document.getElementById('status') as HTMLElement;
const refreshButton = document.getElementById('refresh') as HTMLButtonElement;

function row(label: string, value: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pd2-row';
  const name = document.createElement('span');
  name.className = 'q-rune';
  name.textContent = label;
  const amount = document.createElement('span');
  amount.className = 'pd2-value';
  amount.textContent = value;
  el.append(name, amount);
  return el;
}

async function load(): Promise<void> {
  refreshButton.disabled = true;
  list.replaceChildren(
    ...[0, 1, 2].map(() => {
      const bar = document.createElement('div');
      bar.className = 'pd2-skeleton';
      return bar;
    }),
  );
  try {
    const runes = await window.pd2.call<RunePrice[]>('prices.runes');
    const top = runes.filter((r) => r.priceHr > 0).sort((a, b) => b.priceHr - a.priceHr).slice(0, 8);
    list.replaceChildren(...top.map((r) => row(r.name, `${r.priceHr.toFixed(2)} HR`)));
    status.className = 'pd2-muted';
    status.textContent = top.length ? '' : 'No rune prices yet.';
  } catch (error) {
    list.replaceChildren();
    status.className = 'tone-danger';
    status.textContent = `Could not load prices: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    refreshButton.disabled = false;
  }
}

// The payload is what the worker passed to sdk.panels.open('main', payload).
window.pd2.onPayload((payload) => {
  const item = (payload as { item?: unknown } | null)?.item;
  if (typeof item === 'string') itemLabel.textContent = item;
});

refreshButton.addEventListener('click', () => void load());
void load();
