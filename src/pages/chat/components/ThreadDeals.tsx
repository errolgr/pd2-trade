import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Reply, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { TradeMessageData } from '@/components/trade/TradeMessage';

type DealStatus = 'open' | 'accepted' | 'declined';

/** Incoming offers are accepted when their listing took them, declined when it took another offer. */
function dealStatus(offer: TradeMessageData): DealStatus {
  if (!offer.acceptedOfferId) return 'open';
  return offer.acceptedOfferId === offer.id ? 'accepted' : 'declined';
}

const STATUS_CLASS: Record<DealStatus, string> = {
  open: 'bg-info/15 text-info',
  accepted: 'bg-success/15 text-success',
  declined: 'bg-muted text-muted-foreground',
};

const actionClass = cn(
  'inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium transition-colors duration-(--dur-fast)',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50',
);

/** Action labels drop to icon-only (title tooltip, still the accessible name) when the thread is narrow. */
const actionLabelClass = '@max-[600px]:sr-only';

/** Collapsed strips show the most relevant offer plus an "N more" toggle once there are more than this. */
const COLLAPSE_AFTER = 2;

/**
 * Offers between the signed-in user and the other participant, pinned at the top of their thread: offers on
 * listings linked in the thread (any status) first, then their other open offers. Renders nothing without any.
 */
export function ThreadDeals({
  otherUserId,
  listingIds,
  onCounter,
}: {
  otherUserId: string | undefined;
  listingIds: readonly string[];
  onCounter: (text: string) => void;
}): React.JSX.Element | null {
  const { incomingOffers, outgoingOffers, acceptOffer, rejectOffer, unacceptOffer, revokeOffer } = usePd2Website();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!otherUserId) return null;
  const linked = (offer: TradeMessageData) => !!offer.listingId && listingIds.includes(offer.listingId);
  const deals = [...incomingOffers, ...outgoingOffers]
    .filter((offer) => offer.userId === otherUserId && (linked(offer) || dealStatus(offer) === 'open'))
    .sort(
      (a, b) =>
        Number(linked(b)) - Number(linked(a)) ||
        Number(dealStatus(b) === 'open') - Number(dealStatus(a) === 'open') ||
        b.timestamp.getTime() - a.timestamp.getTime(),
    );
  if (deals.length === 0) return null;
  const collapsed = !expanded && deals.length > COLLAPSE_AFTER;
  const shown = collapsed ? deals.slice(0, 1) : deals;

  // The provider toasts failures; the strip only has to stay usable afterwards.
  const run = async (offerId: string, action: () => Promise<void>) => {
    setBusyId(offerId);
    try {
      await action();
    } catch {
      // Already reported by the provider.
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="@container px-3 pt-2">
      <ul
        aria-label="Offers with this user"
        className="space-y-1 rounded-xl border border-border/70 bg-card/60 p-1.5 text-sm shadow-xs"
      >
        {shown.map((offer) => {
          const status = dealStatus(offer);
          const disabled = busyId !== null;
          const Direction = offer.isIncoming ? ArrowUpRight : ArrowDownLeft;
          return (
            <li key={offer.id}
              className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-border/60 bg-muted/70">
                <Direction className="size-3.5 text-muted-foreground" />
              </span>
              <span className="shrink-0 text-muted-foreground">{offer.isIncoming ? 'Selling' : 'Buying'}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{offer.itemName ?? 'Unknown item'}</span>
              {offer.price && (
                <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-foreground">
                  {offer.price}
                </span>
              )}
              <span
                className={cn(
                  'shrink-0 rounded-sm px-1 text-[10px] font-medium uppercase tracking-wide',
                  STATUS_CLASS[status],
                )}
              >
                {status}
              </span>
              <div className="flex shrink-0 items-center gap-0.5">
                {offer.isIncoming && status === 'open' && offer.listingId && (
                  <button
                    type="button"
                    title="Accept offer"
                    disabled={disabled}
                    className={cn(actionClass, 'text-success hover:bg-success/15')}
                    onClick={() => void run(offer.id, () => acceptOffer(offer.listingId!, offer.id))}
                  >
                    <Check className="size-3.5" />
                    <span className={actionLabelClass}>Accept</span>
                  </button>
                )}
                {offer.isIncoming && status === 'open' && (
                  <>
                    <button
                      type="button"
                      title="Counter in the composer"
                      disabled={disabled}
                      className={cn(actionClass, 'text-foreground hover:bg-accent')}
                      onClick={() => onCounter(offer.itemName ? `Counter for ${offer.itemName}: ` : 'Counter: ')}
                    >
                      <Reply className="size-3.5" />
                      <span className={actionLabelClass}>Counter</span>
                    </button>
                    <button
                      type="button"
                      title="Decline offer"
                      disabled={disabled}
                      className={cn(actionClass, 'text-destructive hover:bg-destructive/15')}
                      onClick={() => void run(offer.id, () => rejectOffer(offer.id))}
                    >
                      <X className="size-3.5" />
                      <span className={actionLabelClass}>Decline</span>
                    </button>
                  </>
                )}
                {offer.isIncoming && status === 'accepted' && offer.listingId && (
                  <button
                    type="button"
                    title="Unaccept offer"
                    disabled={disabled}
                    className={cn(actionClass, 'text-muted-foreground hover:bg-accent hover:text-foreground')}
                    onClick={() => void run(offer.id, () => unacceptOffer(offer.listingId!))}
                  >
                    <Undo2 className="size-3.5" />
                    <span className={actionLabelClass}>Unaccept</span>
                  </button>
                )}
                {!offer.isIncoming && status === 'open' && (
                  <button
                    type="button"
                    title="Revoke offer"
                    disabled={disabled}
                    className={cn(actionClass, 'text-destructive hover:bg-destructive/15')}
                    onClick={() => void run(offer.id, () => revokeOffer(offer.id))}
                  >
                    <Undo2 className="size-3.5" />
                    <span className={actionLabelClass}>Revoke</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {deals.length > COLLAPSE_AFTER && (
          <li>
            <button
              type="button"
              aria-expanded={expanded}
              className={cn(
                actionClass,
                'w-full justify-center text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              onClick={() => setExpanded((open) => !open)}
            >
              <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
              {expanded ? 'Show less' : `${deals.length - 1} more`}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
