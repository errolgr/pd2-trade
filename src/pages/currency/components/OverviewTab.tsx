import React from 'react';
import { formatHr } from '@/lib/utils';
import { NET_WORTH_CATEGORIES, type Valuation } from '@/lib/networth-api';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatUnitPrice } from '../lib/networth-format';
import { ConfidenceBadge, HoldingName, PriceChange } from './HoldingCells';

export function OverviewTab({ valuation }: { valuation: Valuation }) {
  const total = valuation.totalHr;
  const shares = NET_WORTH_CATEGORIES.map((category) => ({
    category,
    value: valuation.byCategory[category] ?? 0,
  })).filter((s) => s.value > 0);
  const top = valuation.lines.filter((line) => line.value > 0).slice(0, 10);
  const tabs = Object.entries(valuation.byTab)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);
  const maxTab = tabs[0]?.[1] ?? 0;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {total > 0 &&
            shares.map(({ category, value }) => (
              <div
                key={category}
                style={{ width: `${(value / total) * 100}%`, background: CATEGORY_COLORS[category] }}
              />
            ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {shares.map(({ category, value }) => (
            <span key={category}
              className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full"
                style={{ background: CATEGORY_COLORS[category] }} />
              {CATEGORY_LABELS[category]} {((value / total) * 100).toFixed(0)}% · {value.toFixed(2)}
            </span>
          ))}
          {shares.length === 0 && <span>No priced holdings yet.</span>}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium">Top holdings</h3>
        <div className="rounded-md border divide-y">
          <div className="grid grid-cols-[1fr_3rem_4rem_5rem_3rem_5rem] gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit</span>
            <span className="text-right">Value</span>
            <span className="text-right">7d</span>
            <span className="text-right">Price</span>
          </div>
          {top.map((line) => (
            <div
              key={`${line.key}|${line.tab ?? ''}`}
              className="grid grid-cols-[1fr_3rem_4rem_5rem_3rem_5rem] items-center gap-2 px-3 py-1.5 text-sm"
            >
              <HoldingName line={line}
                showTab={line.tab !== null} />
              <span className="text-right tabular-nums">{line.qty}</span>
              <span className="text-right tabular-nums text-muted-foreground">{formatUnitPrice(line.unitPrice)}</span>
              <span className="text-right tabular-nums">{line.value.toFixed(2)}</span>
              <span className="text-right">
                <PriceChange percent={line.priceChange7dPercent} />
              </span>
              <span className="flex justify-end">
                <ConfidenceBadge line={line} />
              </span>
            </div>
          ))}
          {top.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing priced yet.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {valuation.unpricedCount} {valuation.unpricedCount === 1 ? 'item' : 'items'} unpriced ·{' '}
          {formatHr(valuation.uncertainHr)} uncertain (low confidence, not in total) · {valuation.gold.toLocaleString()}{' '}
          gold (not converted)
        </p>
      </section>

      {tabs.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium">By stash tab</h3>
          <div className="space-y-1.5">
            {tabs.map(([tab, value]) => (
              <div key={tab}
                className="grid grid-cols-[8rem_1fr_5rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground">{tab}</span>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary/70"
                    style={{ width: `${maxTab > 0 ? (value / maxTab) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-right tabular-nums">{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
