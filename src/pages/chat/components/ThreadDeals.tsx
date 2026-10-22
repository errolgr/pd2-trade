import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckSquare,
  ChevronDown,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  MoreHorizontal,
  Reply,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { fillTemplate } from '@/lib/message-templates';
import type { WhisperPerson, WhisperTrade } from '@/lib/whisper-history';
import { confirmToast, showToast } from '@/overlay';
import { cn } from '@/lib/utils';
import { useChatListings } from '../hooks/useChatListings';
import { useListingMarketPrices } from '../hooks/useListingMarketPrices';
import { shortAgo } from '../hooks/useTraderProfile';
import { ListingThumb } from './ListingCard';
import { Tip } from './chat-parts';

type DealStatus = 'open' | 'accepted' | 'declined' | 'closed' | 'hidden' | 'in-game';

/** A pinned row: a website offer (hidden: an outgoing offer the user hid) or a trade whisper. */
type Deal =
  | { kind: 'offer'; id: string; offer: TradeOffer; hidden: boolean }
  | { kind: 'whisper'; id: string; trade: WhisperTrade; person: WhisperPerson };

/**
 * Website offers, same rule both directions: accepted when the listing took this offer, declined when it
 * took another, closed when the listing was sold or delisted without taking it (outgoing offers on archived
 * listings).
 */
export function offerStatus(offer: TradeOffer): 'open' | 'accepted' | 'declined' | 'closed' {
  if (offer.acceptedOfferId) return offer.acceptedOfferId === offer.id ? 'accepted' : 'declined';
  return offer.listingClosed ? 'closed' : 'open';
}

/** Hidden outgoing offers and trade whispers have their own chips. */
function dealStatus(deal: Deal): DealStatus {
  if (deal.kind === 'whisper') return 'in-game';
  if (deal.hidden) return 'hidden';
  return offerStatus(deal.offer);
}

/** Status chip colours (the trader sidebar's offers). */
export const STATUS_CLASS: Record<DealStatus, string> = {
  open: 'bg-info/15 text-info',
  accepted: 'bg-success/15 text-success',
  declined: 'bg-muted text-muted-foreground',
  closed: 'bg-muted text-muted-foreground',
  hidden: 'bg-muted text-muted-foreground',
  'in-game': 'bg-muted text-muted-foreground',
};

/**
 * A deal row's status colour (its left rail, status line and fallback icon): offers to you (selling) green,
 * yours (buying) blue, accepted in the theme's primary, settled or hidden ones muted.
 */
type Tone = 'selling' | 'buying' | 'accepted' | 'settled';
const TONE: Record<Tone, { text: string; rail: string }> = {
  selling: { text: 'text-success', rail: 'bg-success' },
  buying: { text: 'text-info', rail: 'bg-info' },
  accepted: { text: 'text-primary', rail: 'bg-primary' },
  settled: { text: 'text-muted-foreground', rail: 'bg-muted-foreground/50' },
};

const DEFAULT_TEMPLATES = {
  acceptOfferMessageTemplate: 'Your offer has been accepted. Game: {gameInfo}',
  rejectOfferMessageTemplate: 'Your offer has been rejected.',
  soldOfferMessageTemplate: 'The item has been sold.',
} as const;

// Below 560px of strip width (@max-[559px]) rows drop the asking/market line and actions go icon-only
// (with tooltips).

const actionClass = cn(
  'inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold outline-none transition-[background-color,color,border-color,transform] duration-(--dur-fast) active:scale-[0.97]',
  'focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50',
  '@max-[559px]:h-6 @max-[559px]:px-1.5',
);

/** Action labels drop to icon-only (with a tooltip; the label stays the accessible name) when narrow. */
const actionLabelClass = '@max-[559px]:sr-only';

/** filled: the main action. outline: secondary. destructive: red text. muted: housekeeping. */
type ActionTone = 'filled' | 'outline' | 'destructive' | 'muted';
const ACTION_TONE: Record<ActionTone, string> = {
  filled: 'bg-success text-success-foreground shadow-xs hover:bg-success/90 data-[state=open]:bg-success/90',
  outline: 'border border-border bg-background/60 text-foreground hover:border-primary/40 hover:bg-accent',
  destructive: 'text-destructive hover:bg-destructive/12',
  muted: 'text-muted-foreground hover:bg-accent hover:text-foreground',
};

/** Collapsed strips show the most relevant deal plus an "N more" toggle once there are more than this. */
const COLLAPSE_AFTER = 2;

function ActionButton({
  title,
  label,
  tone,
  disabled,
  onClick,
  children,
}: {
  title: string;
  label: string;
  tone: ActionTone;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tip label={title}>
      <button type="button"
        disabled={disabled}
        className={cn(actionClass, ACTION_TONE[tone])}
        onClick={onClick}>
        {children}
        <span className={actionLabelClass}>{label}</span>
      </button>
    </Tip>
  );
}

/**
 * Accept with game info: the filled "offer accepted" template ({gameInfo} = game, or game////password).
 * `requireGame`: whisper trades need a game to send; website offers can be accepted without one.
 */
function AcceptButton({
  requireGame,
  disabled,
  game,
  onAccept,
}: {
  requireGame: boolean;
  disabled: boolean;
  game: { name: string; password: string; set: (name: string, password: string) => void };
  onAccept: (gameInfo: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (requireGame && !game.name) return;
    setBusy(true);
    try {
      await onAccept(game.password ? `${game.name}////${game.password}` : game.name);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <Tip label={requireGame ? 'Accept: copies a whisper with your game' : 'Accept offer'}>
        <PopoverTrigger disabled={disabled}
          className={cn(actionClass, ACTION_TONE.filled)}>
          <Check className="size-3.5" />
          <span className={actionLabelClass}>Accept</span>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end"
        className="w-auto p-2.5">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="px-0.5 text-xs font-medium text-muted-foreground">
            {requireGame ? 'Copy an accept whisper with your game' : 'Accept (and message your game, if given)'}
          </p>
          {/* Fields on one row, the button below: fits a narrow (360px) chat panel */}
          <div className="flex gap-2">
            <Input
              value={game.name}
              onChange={(e) => game.set(e.target.value, game.password)}
              placeholder="Game"
              aria-label="Game name"
              className="h-8 w-28 text-sm md:text-sm"
            />
            <Input
              value={game.password}
              onChange={(e) => game.set(game.name, e.target.value)}
              placeholder="Password"
              aria-label="Game password"
              className="h-8 w-28 text-sm md:text-sm"
            />
          </div>
          <Button type="submit"
            size="sm"
            disabled={(requireGame && !game.name) || busy}
            className="h-8">
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            Accept offer
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Deals with the person of the open thread, pinned at the top as quiet cards with a status-coloured rail: website offers (on listings linked in the thread, any status, first; then their other
 * open offers; outgoing offers the user hid last) and open trade whispers. Renders nothing without any.
 */
export function ThreadDeals({
  offers,
  hiddenOffers,
  whisperTrades,
  listingIds,
  now,
  onCounter,
  onSendWebsite,
  onWhisper,
  onDismissTrade,
}: {
  /** Website offers with this person, both directions. */
  offers: readonly TradeOffer[];
  /** Outgoing offers to this person the user hid. */
  hiddenOffers: readonly TradeOffer[];
  /** Their open trade whispers. */
  whisperTrades: readonly { person: WhisperPerson; trade: WhisperTrade }[];
  listingIds: readonly string[];
  /** Epoch ms, for "3m ago". */
  now: number;
  onCounter: (text: string) => void;
  /** Sends a website message in this thread (the accept message with game info); resolves whether it was delivered. */
  onSendWebsite: (text: string) => Promise<boolean>;
  /** Copies `/w *<person> <text>` and records it. */
  onWhisper: (person: WhisperPerson, text: string) => void;
  onDismissTrade: (person: WhisperPerson, tradeId: string) => void;
}): React.JSX.Element | null {
  const {
    acceptOffer,
    rejectOffer,
    unacceptOffer,
    revokeOffer,
    deleteOutgoingOffer,
    restoreOutgoingOffer,
    deleteMarketListing,
    refresh,
  } = usePd2Website();
  const { settings } = useOptions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // Shared by every accept in the panel, so one game serves several buyers
  const [gameName, setGameName] = useState('');
  const [gamePassword, setGamePassword] = useState('');
  const game = {
    name: gameName,
    password: gamePassword,
    set: (name: string, password: string) => {
      setGameName(name);
      setGamePassword(password);
    },
  };

  const linked = (deal: Deal) =>
    deal.kind === 'offer' && !!deal.offer.listingId && listingIds.includes(deal.offer.listingId);
  const deals: Deal[] = [
    ...offers.map((offer): Deal => ({ kind: 'offer', id: offer.id, offer, hidden: false })),
    ...hiddenOffers.map((offer): Deal => ({ kind: 'offer', id: offer.id, offer, hidden: true })),
    ...whisperTrades.map(({ person, trade }): Deal => ({ kind: 'whisper', id: trade.id, trade, person })),
  ]
    // Settled offers (accepted, declined, closed) only on listings the thread links
    .filter((deal) => linked(deal) || !['accepted', 'declined', 'closed'].includes(dealStatus(deal)))
    .sort((a, b) => {
      const time = (deal: Deal) => (deal.kind === 'offer' ? deal.offer.timestamp.getTime() : deal.trade.timestamp);
      return (
        Number(linked(b)) - Number(linked(a)) ||
        Number(dealStatus(a) === 'hidden') - Number(dealStatus(b) === 'hidden') ||
        time(b) - time(a)
      );
    });
  const collapsed = !expanded && deals.length > COLLAPSE_AFTER;
  const shown = collapsed ? deals.slice(0, 1) : deals;

  // The offered items, for their picture, asking price and market price
  const listingStates = useChatListings(
    shown.flatMap((deal) => (deal.kind === 'offer' && deal.offer.listingId ? [deal.offer.listingId] : [])),
  );
  const listingOf = (deal: Deal): MarketListingEntry | undefined => {
    const state = deal.kind === 'offer' && deal.offer.listingId ? listingStates.get(deal.offer.listingId) : undefined;
    return state && 'listing' in state ? state.listing : undefined;
  };
  const market = useListingMarketPrices(shown.flatMap((deal) => listingOf(deal) ?? []));
  if (deals.length === 0) return null;

  // The provider toasts failures; the strip only has to stay usable afterwards.
  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    try {
      await action();
    } catch {
      // Already reported by the provider.
    } finally {
      setBusyId(null);
    }
  };

  const template = (key: keyof typeof DEFAULT_TEMPLATES, vars: Record<string, string | undefined>) =>
    fillTemplate(settings?.[key] || DEFAULT_TEMPLATES[key], vars);

  /** Rare and destructive actions live in the row's ⋯ menu. */
  const moreMenu = (itemName: string | undefined, items: React.ReactNode) => (
    <DropdownMenu>
      <Tip label="More actions">
        <DropdownMenuTrigger
          aria-label={`More actions for ${itemName ?? 'this offer'}`}
          disabled={busyId !== null}
          className={cn(actionClass, ACTION_TONE.muted, 'px-1.5 data-[state=open]:bg-accent')}
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end"
        side="bottom"
        sideOffset={4}>
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const deleteListingItem = (offer: TradeOffer, listingId: string) => (
    <DropdownMenuItem
      variant="destructive"
      className="cursor-pointer"
      onSelect={() =>
        confirmToast({
          title: 'Delete Listing?',
          description: offer.itemName
            ? `Are you sure you want to delete the listing for ${offer.itemName}?`
            : 'Are you sure you want to delete this listing?',
          confirmLabel: 'Delete',
          variant: 'warning',
          duration: 10000,
          onConfirm: () =>
            run(offer.id, async () => {
              await deleteMarketListing(listingId);
              await refresh();
            }),
        })
      }
    >
      <Trash2 className="size-4" />
      Delete listing
    </DropdownMenuItem>
  );

  const offerActions = (offer: TradeOffer, status: DealStatus, disabled: boolean) => {
    const listingId = offer.listingId;
    if (status === 'hidden') {
      return (
        <ActionButton
          title="Show this offer again"
          label="Unhide"
          tone="muted"
          disabled={disabled}
          onClick={() => restoreOutgoingOffer(offer.id)}
        >
          <Eye className="size-3.5" />
        </ActionButton>
      );
    }
    if (!offer.isIncoming) {
      return (
        <>
          {status === 'open' && (
            <ActionButton
              title="Revoke offer"
              label="Revoke"
              tone="destructive"
              disabled={disabled}
              onClick={() => void run(offer.id, () => revokeOffer(offer.id))}
            >
              <Undo2 className="size-3.5" />
            </ActionButton>
          )}
          <ActionButton
            title="Hide this offer"
            label="Hide"
            tone="muted"
            disabled={disabled}
            onClick={() => deleteOutgoingOffer(offer.id)}
          >
            <EyeOff className="size-3.5" />
          </ActionButton>
        </>
      );
    }
    return (
      <>
        {status === 'open' && listingId && (
          <AcceptButton
            requireGame={false}
            disabled={disabled}
            game={game}
            onAccept={(gameInfo) =>
              run(offer.id, async () => {
                if (gameInfo) {
                  const sent = await onSendWebsite(
                    template('acceptOfferMessageTemplate', {
                      gameInfo,
                      accountName: offer.accountName,
                      itemName: offer.itemName,
                      price: offer.price,
                    }),
                  );
                  // The buyer needs the game info: never accept without it reaching them.
                  if (!sent) {
                    showToast({
                      title: 'Offer not accepted',
                      description: "The game info wasn't sent. Retry the message, then accept.",
                      variant: 'error',
                    });
                    return;
                  }
                }
                await acceptOffer(listingId, offer.id);
              })
            }
          />
        )}
        {status === 'open' && (
          <>
            <ActionButton
              title="Counter in the composer"
              label="Counter"
              tone="outline"
              disabled={disabled}
              onClick={() => onCounter(offer.itemName ? `Counter for ${offer.itemName}: ` : 'Counter: ')}
            >
              <Reply className="size-3.5" />
            </ActionButton>
            <ActionButton
              title="Decline offer"
              label="Decline"
              tone="destructive"
              disabled={disabled}
              onClick={() => void run(offer.id, () => rejectOffer(offer.id))}
            >
              <X className="size-3.5" />
            </ActionButton>
          </>
        )}
        {status === 'accepted' && listingId && (
          <ActionButton
            title="Unaccept offer"
            label="Unaccept"
            tone="outline"
            disabled={disabled}
            onClick={() => void run(offer.id, () => unacceptOffer(listingId))}
          >
            <Undo2 className="size-3.5" />
          </ActionButton>
        )}
        {listingId && moreMenu(offer.itemName, deleteListingItem(offer, listingId))}
      </>
    );
  };

  const whisperActions = (person: WhisperPerson, trade: WhisperTrade, disabled: boolean) => {
    const vars = {
      accountName: person.accountName,
      characterName: person.characterName,
      itemName: trade.itemName,
      price: trade.price,
    };
    return (
      <>
        {trade.isIncoming && (
          <>
            <AcceptButton
              requireGame
              disabled={disabled}
              game={game}
              onAccept={(gameInfo) => onWhisper(person, template('acceptOfferMessageTemplate', { ...vars, gameInfo }))}
            />
            <ActionButton
              title="Copy an item-sold whisper"
              label="Sold"
              tone="outline"
              disabled={disabled}
              onClick={() => onWhisper(person, template('soldOfferMessageTemplate', vars))}
            >
              <CheckSquare className="size-3.5" />
            </ActionButton>
            <ActionButton
              title="Copy a reject whisper"
              label="Reject"
              tone="destructive"
              disabled={disabled}
              onClick={() => onWhisper(person, template('rejectOfferMessageTemplate', vars))}
            >
              <X className="size-3.5" />
            </ActionButton>
          </>
        )}
        <ActionButton
          title="Dismiss this trade"
          label="Dismiss"
          tone="muted"
          disabled={disabled}
          onClick={() => onDismissTrade(person, trade.id)}
        >
          <Trash2 className="size-3.5" />
        </ActionButton>
      </>
    );
  };

  return (
    <div className="@container px-3 pt-2">
      <ul aria-label="Offers with this user"
        className="space-y-1.5">
        {shown.map((deal) => {
          const status = dealStatus(deal);
          const disabled = busyId !== null;
          const isIncoming = deal.kind === 'offer' ? deal.offer.isIncoming : deal.trade.isIncoming;
          const itemName = deal.kind === 'offer' ? deal.offer.itemName : deal.trade.itemName;
          const price = deal.kind === 'offer' ? deal.offer.price : deal.trade.price;
          const at = deal.kind === 'offer' ? deal.offer.timestamp.getTime() : deal.trade.timestamp;
          const live = status === 'open' || status === 'in-game';
          const tone: Tone = live
            ? isIncoming
              ? 'selling'
              : 'buying'
            : status === 'accepted'
              ? 'accepted'
              : 'settled';
          const colors = TONE[tone];
          let label: string = status;
          if (status === 'open') label = isIncoming ? 'New offer' : 'Your offer';
          else if (status === 'in-game') label = isIncoming ? 'in-game offer' : 'your in-game offer';
          const listing = listingOf(deal);
          const marketPrice = listing ? market.get(listing._id) : undefined;
          const asking = listing && (listing.hr_price > 0 ? `${listing.hr_price} HR` : listing.price);
          const context = [
            asking && `asking ${asking}`,
            marketPrice && `market ${Number(marketPrice.hr.toFixed(2))} HR`,
          ].filter(Boolean);
          const Fallback = deal.kind === 'whisper' ? Gamepad2 : isIncoming ? ArrowUpRight : ArrowDownLeft;
          return (
            <li
              key={`${deal.kind}:${deal.id}`}
              className={cn(
                'relative flex min-h-14 min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border border-border',
                'bg-linear-to-b from-card to-card/85 py-2 pr-2.5 pl-3.5 shadow-xs',
              )}
            >
              <span aria-hidden
                className={cn('absolute inset-y-0 left-0 w-1', colors.rail)} />
              {listing ? (
                <ListingThumb listing={listing}
                  className="size-9 rounded-lg"
                  artClassName="max-h-8 max-w-8" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-linear-to-b from-muted/80 to-muted/40">
                  <Fallback className={cn('size-4', colors.text)} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={cn('truncate text-[10px] font-bold uppercase leading-tight tracking-wider', colors.text)}
                >
                  {label}
                  {live && <span className="font-semibold opacity-80">{` · ${shortAgo(at, now)}`}</span>}
                </div>
                <div className="truncate text-sm font-semibold leading-snug text-foreground">
                  {itemName ?? 'Unknown item'}
                </div>
              </div>
              {context.length > 0 && (
                <span className={cn('min-w-0 shrink truncate text-xs text-muted-foreground', '@max-[559px]:hidden')}>
                  {context.join(' · ')}
                </span>
              )}
              {price && (
                <span
                  className={cn(
                    'shrink-0 whitespace-nowrap text-lg font-extrabold tabular-nums leading-none text-foreground',
                  )}
                >
                  {price}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                {deal.kind === 'offer'
                  ? offerActions(deal.offer, status, disabled)
                  : whisperActions(deal.person, deal.trade, disabled)}
              </div>
            </li>
          );
        })}
        {deals.length > COLLAPSE_AFTER && (
          <li>
            <button
              type="button"
              aria-expanded={expanded}
              className={cn(actionClass, ACTION_TONE.muted, 'h-6 w-full justify-center font-medium')}
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
