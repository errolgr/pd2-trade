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
  Reply,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { fillTemplate } from '@/lib/message-templates';
import type { WhisperPerson, WhisperTrade } from '@/lib/whisper-history';
import { confirmToast } from '@/overlay';
import { cn } from '@/lib/utils';

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

/** Status chip colours (also the trader sidebar's offers). */
export const STATUS_CLASS: Record<DealStatus, string> = {
  open: 'bg-info/15 text-info',
  accepted: 'bg-success/15 text-success',
  declined: 'bg-muted text-muted-foreground',
  closed: 'bg-muted text-muted-foreground',
  hidden: 'bg-muted text-muted-foreground',
  'in-game': 'bg-muted text-muted-foreground',
};

const DEFAULT_TEMPLATES = {
  acceptOfferMessageTemplate: 'Your offer has been accepted. Game: {gameInfo}',
  rejectOfferMessageTemplate: 'Your offer has been rejected.',
  soldOfferMessageTemplate: 'The item has been sold.',
} as const;

const actionClass = cn(
  'inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium transition-colors duration-(--dur-fast)',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50',
);

/** Action labels drop to icon-only (title tooltip, still the accessible name) when the thread is narrow. */
const actionLabelClass = '@max-[600px]:sr-only';

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
  tone: 'success' | 'destructive' | 'neutral' | 'muted';
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={cn(
        actionClass,
        tone === 'success' && 'text-success hover:bg-success/15',
        tone === 'destructive' && 'text-destructive hover:bg-destructive/15',
        tone === 'neutral' && 'text-foreground hover:bg-accent',
        tone === 'muted' && 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
      onClick={onClick}
    >
      {children}
      <span className={actionLabelClass}>{label}</span>
    </button>
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
      <PopoverTrigger
        title="Accept offer"
        disabled={disabled}
        className={cn(actionClass, 'text-success hover:bg-success/15 data-[state=open]:bg-success/15')}
      >
        <Check className="size-3.5" />
        <span className={actionLabelClass}>Accept</span>
      </PopoverTrigger>
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
 * Deals with the person of the open thread, pinned at the top: website offers (on listings linked in the
 * thread, any status, first; then their other open offers; outgoing offers the user hid last) and open trade
 * whispers. Renders nothing without any.
 */
export function ThreadDeals({
  offers,
  hiddenOffers,
  whisperTrades,
  listingIds,
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
  onCounter: (text: string) => void;
  /** Sends a website message in this thread (the accept message with game info). */
  onSendWebsite: (text: string) => Promise<void>;
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
  if (deals.length === 0) return null;
  const collapsed = !expanded && deals.length > COLLAPSE_AFTER;
  const shown = collapsed ? deals.slice(0, 1) : deals;

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
                  await onSendWebsite(
                    template('acceptOfferMessageTemplate', {
                      gameInfo,
                      accountName: offer.accountName,
                      itemName: offer.itemName,
                      price: offer.price,
                    }),
                  );
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
              tone="neutral"
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
            tone="muted"
            disabled={disabled}
            onClick={() => void run(offer.id, () => unacceptOffer(listingId))}
          >
            <Undo2 className="size-3.5" />
          </ActionButton>
        )}
        {listingId && (
          <ActionButton
            title="Delete the listing"
            label="Delete listing"
            tone="destructive"
            disabled={disabled}
            onClick={() =>
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
            <Trash2 className="size-3.5" />
          </ActionButton>
        )}
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
              title="Copy a reject whisper"
              label="Reject"
              tone="destructive"
              disabled={disabled}
              onClick={() => onWhisper(person, template('rejectOfferMessageTemplate', vars))}
            >
              <X className="size-3.5" />
            </ActionButton>
            <ActionButton
              title="Copy an item-sold whisper"
              label="Sold"
              tone="neutral"
              disabled={disabled}
              onClick={() => onWhisper(person, template('soldOfferMessageTemplate', vars))}
            >
              <CheckSquare className="size-3.5" />
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
      <ul
        aria-label="Offers with this user"
        className="space-y-1 rounded-xl border border-border/70 bg-linear-to-b from-card/95 to-card/60 p-1.5 text-sm shadow-sm ring-1 ring-inset ring-foreground/5"
      >
        {shown.map((deal) => {
          const status = dealStatus(deal);
          const disabled = busyId !== null;
          const isIncoming = deal.kind === 'offer' ? deal.offer.isIncoming : deal.trade.isIncoming;
          const itemName = deal.kind === 'offer' ? deal.offer.itemName : deal.trade.itemName;
          const price = deal.kind === 'offer' ? deal.offer.price : deal.trade.price;
          const Direction = deal.kind === 'whisper' ? Gamepad2 : isIncoming ? ArrowUpRight : ArrowDownLeft;
          return (
            <li
              key={`${deal.kind}:${deal.id}`}
              className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors duration-(--dur-fast) hover:bg-muted/40"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-[5px] border border-border/60 bg-muted/70">
                <Direction className="size-3.5 text-muted-foreground" />
              </span>
              {/* The direction icon says it when narrow */}
              <span className="shrink-0 text-muted-foreground @max-[420px]:sr-only">
                {isIncoming ? 'Selling' : 'Buying'}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">{itemName ?? 'Unknown item'}</span>
              {price && (
                <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-foreground">{price}</span>
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
