import type { RunePrice } from '@pd2-trader/plugin-sdk';
import {
  changePercent,
  formatHr,
  highRunes,
  HIGH_RUNES,
  isSnapshot,
  trendOf,
  type PanelRequest,
  type PriceMap,
  type TickerRune,
} from './ticker';

// Plain DOM + theme kit classes (window.pd2 bridge); text goes through textContent only.
const rows = document.getElementById('rows') as HTMLTableSectionElement;
const status = document.getElementById('status') as HTMLElement;
const refreshButton = document.getElementById('refresh') as HTMLButtonElement;

/** Trend baseline from the worker (it remembers prices across sessions). */
let baseline: PriceMap | null = null;
let current: TickerRune[] = [];

function cell(content: string | HTMLElement, className?: string): HTMLTableCellElement {
  const td = document.createElement('td');
  if (typeof content === 'string') td.textContent = content;
  else td.append(content);
  if (className) td.className = className;
  return td;
}

function trendBadge(rune: TickerRune): HTMLElement {
  const change = changePercent(rune.name, rune.priceHr, baseline);
  const trend = trendOf(change);
  const badge = document.createElement('span');
  badge.className = 'pd2-badge';
  if (trend === 'flat' || change === null) {
    badge.textContent = '—';
    return badge;
  }
  badge.dataset.tone = trend === 'up' ? 'success' : 'danger';
  badge.textContent = `${trend === 'up' ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`;
  return badge;
}

function renderSkeleton() {
  rows.replaceChildren(
    ...HIGH_RUNES.slice(0, 6).map(() => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      const bar = document.createElement('div');
      bar.className = 'pd2-skeleton';
      td.append(bar);
      tr.append(td);
      return tr;
    }),
  );
}

function render() {
  if (!current.length) {
    rows.replaceChildren();
    status.textContent = 'No rune prices for this mode yet.';
    return;
  }
  rows.replaceChildren(
    ...current.map((rune) => {
      const tr = document.createElement('tr');
      tr.append(
        cell(rune.name, 'q-rune'),
        cell(formatHr(rune.priceHr), 'pd2-value'),
        cell(String(rune.listings), 'pd2-muted'),
        cell(trendBadge(rune)),
      );
      return tr;
    }),
  );
}

const stamp = (at: Date) => `Updated ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

async function load() {
  refreshButton.disabled = true;
  if (!current.length) renderSkeleton();
  try {
    current = highRunes(await window.pd2.call<RunePrice[]>('prices.runes'));
    render();
    status.className = 'pd2-muted';
    status.textContent = stamp(new Date());
  } catch (error) {
    if (!current.length) rows.replaceChildren();
    status.className = 'tone-danger';
    status.textContent = `Could not load rune prices: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    refreshButton.disabled = false;
  }
}

window.pd2.onMessage((data) => {
  if (!isSnapshot(data)) return;
  baseline = data.previous;
  current = data.runes;
  render();
  status.className = 'pd2-muted';
  status.textContent = stamp(new Date(data.at));
});

refreshButton.addEventListener('click', () => {
  window.pd2.post({ type: 'refresh' } satisfies PanelRequest);
  void load();
});

window.pd2.post({ type: 'sync' } satisfies PanelRequest);
void load();
