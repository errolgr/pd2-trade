import * as React from 'react';

import { cn } from '../../lib/utils';
import { ItemCard } from '../card';
import { ItemName, type ItemQuality } from '../item-name';
import { PriceTag, type PriceUnit } from '../price';
import { StatLine } from '../rows';
import { CorruptionBadge } from './corruption-badge';
import { ItemArt } from './item-art';
import type { TooltipMod } from './item-tooltip';
import { useD2Labels } from './labels';
import { ModeBadge } from './mode-badge';

export type Presence = 'online' | 'away' | 'offline';

const PRESENCE: Record<Presence, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  offline: 'bg-muted-foreground/50',
};

interface ListingCardProps {
  item: {
    name: string;
    quality?: ItemQuality | (string & {}) | null;
    runeword?: boolean;
    base?: string | null;
    src?: string | readonly string[] | null;
    ethereal?: boolean;
    corrupted?: boolean;
    sockets?: number;
  };
  /** Asking price; omit for offer-only listings and pass `priceText`. */
  price?: { amount: number; unit: PriceUnit; rune?: string };
  /** Shown instead of a price ("Offer", "2 Ber + Ist"). */
  priceText?: React.ReactNode;
  seller: { name: React.ReactNode; presence?: Presence };
  /** Listed / bumped age, formatted by the host ("12m"). */
  age?: React.ReactNode;
  ladder?: boolean;
  hardcore?: boolean;
  /** Mod preview lines (the first `modLimit` show). */
  mods?: readonly TooltipMod[];
  /** Default 3. */
  modLimit?: number;
  /** Corruption outcome for the corrupted chip. */
  corruption?: React.ReactNode;
  /** Footer right (message seller, watch). */
  actions?: React.ReactNode;
  /** Badge row extras (deal verdict). */
  badges?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

/**
 * A market listing as a card: art, quality-colored name and base, asking price and age, a few mods, flags
 * (corrupted, ethereal, sockets), mode, and the seller with presence. Dense lists use `MarketRow`.
 */
function ListingCard({
  item,
  price,
  priceText,
  seller,
  age,
  ladder,
  hardcore,
  mods = [],
  modLimit = 3,
  corruption,
  actions,
  badges,
  onClick,
  selected,
  className,
}: ListingCardProps) {
  const l = useD2Labels();
  const shown = mods.slice(0, modLimit);
  const presence = seller.presence;
  return (
    <ItemCard
      data-slot="listing-card"
      tone={onClick ? (selected ? 'selected' : 'interactive') : 'static'}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? Boolean(selected) : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
          : undefined
      }
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="flex items-start gap-2.5">
        <ItemArt name={item.name}
          quality={item.quality}
          runeword={item.runeword}
          src={item.src}
          size={40} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <ItemName name={item.name}
            quality={item.quality}
            runeword={item.runeword}
            className="truncate text-sm font-medium" />
          {item.base && item.base !== item.name && (
            <span className="truncate text-2xs text-muted-foreground">{item.base}</span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          {price ? (
            <PriceTag {...price}
              className="text-sm font-semibold text-foreground" />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">{priceText}</span>
          )}
          {age && <span className="text-2xs text-muted-foreground tabular-nums">{age}</span>}
        </div>
      </div>

      {shown.length > 0 && (
        <div className="flex flex-col gap-px text-xs">
          {shown.map((m, i) => (
            <StatLine key={i}
              range={m.range ?? undefined}
              value={m.value ?? undefined}
              corrupted={m.corrupted}
              className="truncate">
              {m.text}
            </StatLine>
          ))}
          {mods.length > modLimit && (
            <span className="text-2xs text-muted-foreground">{l.more(String(mods.length - modLimit))}</span>
          )}
        </div>
      )}

      {(item.corrupted || item.ethereal || (item.sockets ?? 0) > 0 || badges) && (
        <div className="flex flex-wrap items-center gap-1">
          {item.corrupted && <CorruptionBadge outcome={corruption} />}
          {item.ethereal && (
            <span className="rounded-sm border border-border px-1.5 py-px text-2xs text-muted-foreground">
              {l.etherealShort}
            </span>
          )}
          {(item.sockets ?? 0) > 0 && (
            <span className="rounded-sm border border-border px-1.5 py-px text-2xs text-muted-foreground tabular-nums">
              {l.sockets(String(item.sockets))}
            </span>
          )}
          {badges}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border/60 pt-2 text-2xs">
        {presence && (
          <span role="img"
            aria-label={l[presence]}
            className={cn('size-1.5 shrink-0 rounded-full', PRESENCE[presence])} />
        )}
        <span className="min-w-0 truncate text-foreground">{seller.name}</span>
        <ModeBadge ladder={ladder}
          hardcore={hardcore}
          size="short"
          className="ml-auto" />
        {actions && <span className="flex shrink-0 items-center gap-1">{actions}</span>}
      </div>
    </ItemCard>
  );
}

export { ListingCard };
export type { ListingCardProps };
