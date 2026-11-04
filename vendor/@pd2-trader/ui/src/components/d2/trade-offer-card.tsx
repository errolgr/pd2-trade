import * as React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { cn } from '../../lib/utils';
import { ItemCard } from '../card';
import { ItemName, type ItemQuality } from '../item-name';
import { PriceTag, type PriceUnit } from '../price';
import { ItemArt } from './item-art';
import { useD2Labels } from './labels';

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'expired';

const STATUS: Record<OfferStatus, string> = {
  pending: 'border-info/40 bg-info/10 text-info',
  accepted: 'border-success/40 bg-success/10 text-success',
  declined: 'border-destructive/40 bg-destructive/10 text-destructive',
  countered: 'border-warning/40 bg-warning/10 text-warning',
  expired: 'border-border text-muted-foreground',
};

type Price = { amount: number; unit: PriceUnit; rune?: string };

interface TradeOfferCardProps {
  /** The listing the offer is on. */
  item: { name: string; quality?: ItemQuality | (string & {}) | null; runeword?: boolean; src?: string | readonly string[] | null };
  /** `received` on your listing, `sent` by you. */
  direction: 'received' | 'sent';
  /** The other trader. */
  counterparty: React.ReactNode;
  /** The offered price, or items as a node ("Ber + Ist"). */
  offer: Price | React.ReactNode;
  /** The listing's asking price, shown for comparison. */
  asking?: Price;
  status: OfferStatus;
  /** Formatted by the host ("5m ago"). */
  age?: React.ReactNode;
  /** The trader's note. */
  message?: React.ReactNode;
  /** Accept / decline / counter buttons. */
  actions?: React.ReactNode;
  className?: string;
}

const isPrice = (v: unknown): v is Price =>
  typeof v === 'object' && v !== null && 'amount' in v && 'unit' in v && !React.isValidElement(v);

/** A trade offer on a listing: item, who and which way, offered vs asking price, status, note and actions. */
function TradeOfferCard({
  item,
  direction,
  counterparty,
  offer,
  asking,
  status,
  age,
  message,
  actions,
  className,
}: TradeOfferCardProps) {
  const l = useD2Labels();
  const Arrow = direction === 'received' ? ArrowDownLeft : ArrowUpRight;
  return (
    <ItemCard data-slot="trade-offer-card"
      data-status={status}
      className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2.5">
        <ItemArt name={item.name}
          quality={item.quality}
          runeword={item.runeword}
          src={item.src}
          size={32} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <ItemName name={item.name}
            quality={item.quality}
            runeword={item.runeword}
            className="truncate text-sm font-medium" />
          <span className="flex min-w-0 items-center gap-1 text-2xs text-muted-foreground">
            <Arrow aria-hidden
              className="size-3 shrink-0" />
            <span className="truncate text-foreground">{counterparty}</span>
            {age && <span className="shrink-0 tabular-nums">· {age}</span>}
          </span>
        </div>
        <span className={cn('shrink-0 rounded-sm border px-1.5 py-px text-3xs font-medium uppercase tracking-caps', STATUS[status])}>
          {l.offerStatus(status)}
        </span>
      </div>
      <div className="flex items-baseline gap-2 text-xs">
        <span className="text-sm font-semibold text-foreground">
          {isPrice(offer) ? <PriceTag {...offer} /> : offer}
        </span>
        {asking && (
          <span className="text-2xs text-muted-foreground line-through decoration-muted-foreground/60">
            <PriceTag {...asking} />
          </span>
        )}
      </div>
      {message && <p className="rounded-sm bg-muted/40 px-2 py-1 text-xs text-foreground">{message}</p>}
      {actions && <div className="flex items-center justify-end gap-1.5">{actions}</div>}
    </ItemCard>
  );
}

export { TradeOfferCard };
export type { TradeOfferCardProps };
