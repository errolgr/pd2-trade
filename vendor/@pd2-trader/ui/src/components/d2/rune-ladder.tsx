import * as React from 'react';

import { cn } from '../../lib/utils';
import type { PriceTrend, PriceUnit } from '../price';
import { MarketRow } from '../rows';
import { RuneIcon } from '../rune-icon';
import { runeNumber, runeTier, type RuneTier } from './data';
import { useD2Labels } from './labels';

export interface RunePrice {
  /** "Ber" or "Ber Rune". */
  name: string;
  /** Price in the ladder's `unit`; null when there is no reliable price. */
  price: number | null;
  /** Change over the host's window (7d), in %. */
  change?: number;
  /** Listings behind the price. */
  listings?: number;
}

interface RuneLadderProps extends Omit<React.ComponentProps<'div'>, 'children' | 'onSelect'> {
  runes: readonly RunePrice[];
  /** Default `hr`. */
  unit?: PriceUnit;
  /** Unit `rune`: the rune prices are counted in. */
  rune?: string;
  /** Group under Low / Mid / High headers. Default true. */
  grouped?: boolean;
  /** Marks one rune (the one being priced). */
  highlight?: string;
  onSelect?: (rune: RunePrice) => void;
}

const TIERS: RuneTier[] = ['high', 'mid', 'low'];

/** Rune price list from Zod down: rune art, number, price with trend and change, grouped by trade tier. */
function RuneLadder({ runes, unit = 'hr', rune, grouped = true, highlight, onSelect, className, ...props }: RuneLadderProps) {
  const l = useD2Labels();
  const sorted = [...runes].sort((a, b) => (runeNumber(b.name) ?? 0) - (runeNumber(a.name) ?? 0));
  const groups = grouped
    ? TIERS.map((tier) => ({ tier, rows: sorted.filter((r) => runeTier(r.name) === tier) })).filter((g) => g.rows.length)
    : [{ tier: null, rows: sorted }];
  const base = (name: string) => name.replace(/ Rune$/, '');

  return (
    <div data-slot="rune-ladder"
      className={cn('flex flex-col', className)}
      {...props}>
      {groups.map((g) => (
        <section key={g.tier ?? 'all'}
          aria-label={g.tier ? l.runeTier(g.tier) : l.runes}>
          {g.tier && (
            <div className="px-2 pt-2 pb-1 text-3xs font-medium text-muted-foreground uppercase tracking-caps">
              {l.runeTier(g.tier)}
            </div>
          )}
          {g.rows.map((r) => {
            const trend: PriceTrend | undefined =
              r.change === undefined ? undefined : r.change > 0.5 ? 'up' : r.change < -0.5 ? 'down' : 'flat';
            return (
              <MarketRow
                key={r.name}
                name={base(r.name)}
                quality="Rune"
                icon={<RuneIcon rune={r.name}
                  className="size-6" />}
                subtitle={`#${runeNumber(r.name) ?? '?'}${r.listings !== undefined ? ` · ${l.listings(String(r.listings))}` : ''}`}
                price={r.price === null ? undefined : { amount: r.price, unit, rune, trend }}
                meta={
                  r.price === null
                    ? '—'
                    : r.change !== undefined && (
                      <span className={cn('tabular-nums', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : '')}>
                        {`${r.change > 0 ? '+' : ''}${r.change.toFixed(1)}%`}
                      </span>
                    )
                }
                selected={highlight !== undefined && base(highlight) === base(r.name)}
                onClick={onSelect ? () => onSelect(r) : undefined}
                className={cn(!onSelect && highlight !== undefined && base(highlight) === base(r.name) && 'rounded-md bg-accent/60')}
              />
            );
          })}
        </section>
      ))}
    </div>
  );
}

export { RuneLadder };
export type { RuneLadderProps };
