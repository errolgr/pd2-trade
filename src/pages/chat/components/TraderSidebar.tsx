import React, { useState } from 'react';
import moment from 'moment';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Copy,
  ExternalLink,
  Gamepad2,
  Handshake,
  Link2,
  MessageCircle,
  PackageSearch,
  PanelRightClose,
  Store,
  Shield,
  Swords,
  UserRound,
} from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { writeText } from '@/lib/browser-clipboard';
import { openUrl } from '@/lib/browser-opener';
import { showToast, useOverlay } from '@/overlay';
import { cn } from '@/lib/utils';
import { type ChatListingState, useChatListings } from '../hooks/useChatListings';
import { type ListingMarketPrice, useListingMarketPrices } from '../hooks/useListingMarketPrices';
import { presenceLabel, shortAgo, type TraderProfile } from '../hooks/useTraderProfile';
import type { InboxThread } from '../lib/inbox';
import { ListingDetails, ListingThumb, marketDelta, nameColor } from './ListingCard';
import { OfferHoverCard, offerStatus, STATUS_CLASS } from './ThreadDeals';
import { characterUrl, ChatAvatar, marketUrl, profileUrl, Tip } from './chat-parts';

/** Their listings shown in the grid; the rest are behind "N more" (their market on the website). */
const MARKET_GRID_LIMIT = 8;

const priceText = (listing: MarketListingEntry) => (listing.hr_price > 0 ? `${listing.hr_price} HR` : listing.price);

/** Copies `*account` (what goes after /w in the game chat). */
async function copyAccount(account: string) {
  try {
    await writeText(`*${account}`);
    showToast({ title: `Copied *${account}`, description: 'Type /w and paste it in the game chat to whisper them.' });
  } catch {
    showToast({ title: 'Not copied', description: "Couldn't write to the clipboard.", variant: 'error' });
  }
}

const presenceTone: Record<TraderProfile['presence']['kind'], string> = {
  ingame: 'bg-success shadow-[0_0_6px] shadow-success/60',
  online: 'bg-warning',
  seen: 'bg-muted-foreground/50',
  unknown: 'bg-muted-foreground/30',
};

function Section({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}
      className="space-y-2">
      <h4 className="flex items-center gap-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="flex-1">{title}</span>
        {aside}
      </h4>
      {children}
    </section>
  );
}

const actionButtonClass = cn(
  'inline-flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] font-medium text-muted-foreground outline-none',
  'transition-[background-color,color,transform] duration-(--dur-fast) hover:bg-primary/10 hover:text-foreground active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring/60',
);

/** One of their listings in the market grid: hover for details, click to link it in the composer. */
function MarketTile({
  listing,
  market,
  onInsert,
}: {
  listing: MarketListingEntry;
  market: ListingMarketPrice | undefined;
  onInsert: (listing: MarketListingEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Link ${listing.item.name} in your message`}
          onClick={(e) => {
            // A click links it; the popover is for hovering (keep Radix from toggling it open)
            e.preventDefault();
            setOpen(false);
            onInsert(listing);
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="group/tile flex min-w-0 flex-col items-center gap-1 rounded-lg border border-border/60 bg-linear-to-b from-background/70 to-background/30 p-1.5 shadow-xs outline-none transition-[border-color,transform,box-shadow] duration-(--dur-fast) hover:-translate-y-px hover:border-primary/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
        >
          <ListingThumb
            listing={listing}
            className="size-10 border-0 bg-transparent shadow-none"
            artClassName="max-h-9 max-w-9 transition-transform duration-(--dur-fast) group-hover/tile:scale-110"
          />
          <span className="w-full truncate text-center text-[10px] font-semibold tabular-nums text-foreground/85">
            {priceText(listing) || '—'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        side="left"
        align="start"
        className="w-auto border-0 bg-transparent p-0 shadow-none"
      >
        <ListingDetails listing={listing}
          listed
          market={market}
          hint="Click to link it in your message" />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The open thread's "Trader" panel: who they are (profile, presence, accounts, links), what is going on
 * between you (offers, listings linked in the thread), their market (click an item to link it in the
 * composer) and their in-game whispers.
 */
export function TraderSidebar({
  thread,
  profile,
  whisperAccount,
  characterName,
  linkedListingIds,
  listings,
  now,
  onInsertListing,
  onClose,
  closeLabel,
  className,
}: {
  thread: InboxThread;
  profile: TraderProfile;
  /** The account `/w *account` reaches. */
  whisperAccount: string | undefined;
  /** A character seen in their whispers. */
  characterName: string | undefined;
  linkedListingIds: readonly string[];
  listings: ReadonlyMap<string, ChatListingState>;
  now: number;
  onInsertListing: (listing: MarketListingEntry) => void;
  onClose: () => void;
  closeLabel: string;
  className?: string;
}) {
  const { participant } = thread;
  const { openPanel } = useOverlay();
  const username = participant?.username;
  const joined = participant?.created_at ? moment(participant.created_at) : null;
  const accounts = [
    ...new Set([...thread.accounts, ...thread.people.flatMap((p) => (p.accountName ? [p.accountName] : []))]),
  ];

  const linked = [...new Set(linkedListingIds)].flatMap((id) => {
    const state = listings.get(id);
    return state && 'listing' in state ? [{ listing: state.listing, listed: state.status === 'listed' }] : [];
  });
  const grid = profile.listings.slice(0, MARKET_GRID_LIMIT);
  const offers = [...thread.offers].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  // The offered listings, for the offer hover cards
  const offerListings = useChatListings(offers.flatMap((offer) => (offer.listingId ? [offer.listingId] : [])));
  const offerListingState = (offer: TradeOffer) => (offer.listingId ? offerListings.get(offer.listingId) : undefined);
  const prices = useListingMarketPrices([
    ...linked.map((l) => l.listing),
    ...grid,
    ...offers.flatMap((offer) => {
      const state = offerListingState(offer);
      return state && 'listing' in state ? [state.listing] : [];
    }),
  ]);
  const openOffers = offers.filter((offer) => offerStatus(offer) === 'open').length;
  const whisperCount = thread.people.reduce((sum, p) => sum + p.messages.length, 0);
  const lastWhisper = Math.max(0, ...thread.people.map((p) => p.messages.at(-1)?.timestamp ?? 0));

  let presence: React.ReactNode = null;
  if (thread.userId) {
    presence =
      profile.status === 'loading' ? (
        <Skeleton className="h-3.5 w-24" />
      ) : (
        <span className="flex items-center gap-1.5">
          <span aria-hidden
            className={cn('size-2 shrink-0 rounded-full', presenceTone[profile.presence.kind])} />
          {presenceLabel(profile.presence, now)}
        </span>
      );
  }

  let market: React.ReactNode;
  if (profile.status === 'loading') {
    market = (
      <div aria-busy
        className="grid grid-cols-4 gap-1.5">
        <span className="sr-only">Loading their listings...</span>
        {Array.from({ length: MARKET_GRID_LIMIT }, (_, i) => (
          <Skeleton key={i}
            className="h-[66px] rounded-lg" />
        ))}
      </div>
    );
  } else if (grid.length === 0) {
    market = (
      <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
        {profile.status === 'error' ? "Couldn't load their listings." : 'No active listings.'}
      </p>
    );
  } else {
    market = (
      <>
        <div className="grid grid-cols-4 gap-1.5">
          {grid.map((listing) => (
            <MarketTile
              key={listing._id}
              listing={listing}
              market={prices.get(listing._id)}
              onInsert={onInsertListing}
            />
          ))}
        </div>
        <p className="px-0.5 text-[11px] text-muted-foreground">Click an item to link it in your message.</p>
        {thread.userId && (
          <button
            type="button"
            onClick={() =>
              openPanel('market', {
                filters: { sellerUserId: thread.userId, sellerName: username ?? thread.name },
                tab: 'search',
              })
            }
            className="inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-border/60 text-[11px] font-medium text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Store className="size-3.5" />
            Browse all listings
          </button>
        )}
      </>
    );
  }

  return (
    <aside
      aria-label="Trader"
      className={cn(
        'flex min-h-0 w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-card/40',
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-3">
        <UserRound className="size-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-semibold tracking-tight">Trader</span>
        <Tip label={closeLabel}>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <PanelRightClose className="size-4" />
          </button>
        </Tip>
      </div>
      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-5 p-3">
          {/* Profile card */}
          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-linear-to-br from-primary/10 via-card to-card p-3 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"
            />
            <div className="flex items-center gap-3">
              <ChatAvatar
                name={thread.name}
                solid
                presence={profile.status === 'ready' ? profile.presence.kind : undefined}
                className="size-11 shrink-0 text-lg shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold leading-tight text-foreground">{thread.name}</h4>
                {username ? (
                  <button
                    type="button"
                    onClick={() => openUrl(profileUrl(username))}
                    className="inline-flex max-w-full items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <span className="truncate">@{username}</span>
                    <ExternalLink aria-hidden
                      className="size-3 shrink-0" />
                  </button>
                ) : (
                  // A website user without a known username (a market seller messaged from the market) is still linked
                  !thread.userId && (
                    <span className="block truncate text-xs text-muted-foreground">
                      Not linked to a website account
                    </span>
                  )
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  {presence}
                  {joined?.isValid() && (
                    <span className="flex items-center gap-1">
                      <CalendarDays aria-hidden
                        className="size-3" />
                      Joined {joined.format('MMM YYYY')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {accounts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {accounts.map((account) => (
                  <Tip key={account}
                    label={`In-game account. Click to copy *${account} for /w in the game chat.`}>
                    <button
                      type="button"
                      aria-label={`Copy *${account}`}
                      onClick={() => void copyAccount(account)}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-foreground/90 outline-none transition-colors duration-(--dur-fast) hover:border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      <Gamepad2 aria-hidden
                        className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">*{account}</span>
                    </button>
                  </Tip>
                ))}
              </div>
            )}

            {/* Actions: a footer section of the card, one row */}
            <div className="-mx-3 -mb-3 mt-3 flex gap-0.5 border-t border-border/60 bg-background/30 p-1">
              {username && (
                <>
                  <Tip label="View their profile on projectdiablo2.com">
                    <button
                      type="button"
                      aria-label="View profile"
                      className={actionButtonClass}
                      onClick={() => openUrl(profileUrl(username))}
                    >
                      <UserRound className="size-3.5 shrink-0" />
                      <span className="truncate">Profile</span>
                    </button>
                  </Tip>
                  <Tip label="Their market listings on projectdiablo2.com">
                    <button
                      type="button"
                      aria-label="Their market"
                      className={actionButtonClass}
                      onClick={() => openUrl(marketUrl(username))}
                    >
                      <Store className="size-3.5 shrink-0" />
                      <span className="truncate">Market</span>
                    </button>
                  </Tip>
                </>
              )}
              {characterName && (
                <Tip label="View character">
                  <button
                    type="button"
                    aria-label="View character"
                    className={actionButtonClass}
                    onClick={() => openUrl(characterUrl(characterName))}
                  >
                    <Swords className="size-3.5 shrink-0" />
                    <span className="truncate">Character</span>
                  </button>
                </Tip>
              )}
              {characterName && (
                <Tip label="Their ladder build in the Builds panel">
                  <button
                    type="button"
                    aria-label="View build"
                    className={actionButtonClass}
                    onClick={() => openPanel('builds', { character: { name: characterName } })}
                  >
                    <Shield className="size-3.5 shrink-0" />
                    <span className="truncate">Build</span>
                  </button>
                </Tip>
              )}
              {whisperAccount && (
                <Tip label={`Copies *${whisperAccount}: type /w and paste it in the game chat`}>
                  <button
                    type="button"
                    aria-label="Copy whisper target"
                    className={actionButtonClass}
                    onClick={() => void copyAccount(whisperAccount)}
                  >
                    <Copy className="size-3.5 shrink-0" />
                    <span className="truncate">Whisper</span>
                  </button>
                </Tip>
              )}
            </div>
          </div>

          {/* Trade with you */}
          <Section icon={Handshake}
            title="Trade with you">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Open offers', value: openOffers },
                { label: 'Linked items', value: linked.length },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border/60 bg-linear-to-b from-background/60 to-background/20 px-2.5 py-1.5"
                >
                  <div className="text-lg font-semibold leading-tight tabular-nums text-foreground">{value}</div>
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            {offers.length > 0 && (
              <ul aria-label="Offers between you"
                className="space-y-1">
                {offers.map((offer) => {
                  const status = offerStatus(offer);
                  const Direction = offer.isIncoming ? ArrowUpRight : ArrowDownLeft;
                  const state = offerListingState(offer);
                  const listing = state && 'listing' in state ? state.listing : undefined;
                  return (
                    <OfferHoverCard
                      key={offer.id}
                      offer={offer}
                      listing={listing}
                      listed={state?.status === 'listed'}
                      loading={state?.status === 'loading'}
                      market={listing && prices.get(listing._id)}
                      now={now}
                      side="left"
                    >
                      <li className="flex min-w-0 items-center gap-2 rounded-lg bg-background/40 px-2 py-1.5 text-xs">
                        <Direction
                          aria-label={offer.isIncoming ? 'Their offer to you' : 'Your offer'}
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">{offer.itemName ?? 'Unknown item'}</span>
                        {offer.price && (
                          <span className="max-w-20 shrink-0 truncate font-semibold tabular-nums">{offer.price}</span>
                        )}
                        <span
                          className={cn(
                            'shrink-0 rounded-sm px-1 text-[10px] font-medium uppercase tracking-wide',
                            STATUS_CLASS[status],
                          )}
                        >
                          {status}
                        </span>
                      </li>
                    </OfferHoverCard>
                  );
                })}
              </ul>
            )}
            {linked.length > 0 && (
              <ul aria-label="Linked in this chat"
                className="space-y-1">
                {linked.map(({ listing, listed }) => {
                  const market = prices.get(listing._id);
                  const delta = market && listing.hr_price > 0 ? marketDelta(listing.hr_price, market.hr) : null;
                  return (
                    <li key={listing._id}>
                      <button
                        type="button"
                        onClick={() => openUrl(`https://www.projectdiablo2.com/market/listing/${listing._id}`)}
                        className="flex w-full min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none transition-colors duration-(--dur-fast) hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring/60"
                      >
                        <ListingThumb listing={listing}
                          className={cn(!listed && 'opacity-50 grayscale')} />
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-xs font-semibold', nameColor(listing))}>
                            {listing.item.name}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <span className="truncate tabular-nums text-foreground/85">
                              {priceText(listing) || '—'}
                            </span>
                            {market && (
                              <span className="shrink-0 tabular-nums">{`· mkt ${Number(market.hr.toFixed(2))} HR`}</span>
                            )}
                          </span>
                          {delta && <span className={cn('block text-[10px]', delta.className)}>{delta.text}</span>}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-sm px-1 text-[10px] font-medium uppercase tracking-wide',
                            listed ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {listed ? 'Listed' : 'Unlisted'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {offers.length === 0 && linked.length === 0 && (
              <p className="flex items-center gap-1.5 px-0.5 text-xs text-muted-foreground">
                <Link2 className="size-3.5" />
                No offers or linked items yet.
              </p>
            )}
          </Section>

          {/* Their market */}
          {thread.userId && (
            <Section
              icon={PackageSearch}
              title="Their market"
              aside={
                profile.status === 'ready' &&
                profile.total > grid.length &&
                username && (
                  <button
                    type="button"
                    onClick={() => openUrl(marketUrl(username))}
                    className="inline-flex items-center gap-0.5 rounded-sm normal-case tracking-normal text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    {profile.total - grid.length} more
                    <ExternalLink aria-hidden
                      className="size-3" />
                  </button>
                )
              }
            >
              {market}
            </Section>
          )}

          {/* In-game */}
          {thread.people.length > 0 && (
            <Section icon={Gamepad2}
              title="In-game">
              <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/30 px-2.5 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageCircle className="size-3.5" />
                    Whispers
                  </span>
                  <span className="font-semibold tabular-nums">{whisperCount}</span>
                </div>
                {lastWhisper > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Last whisper</span>
                    <span title={moment(lastWhisper).format('ddd, MMM D YYYY · h:mm A')}>
                      {shortAgo(lastWhisper, now)}
                    </span>
                  </div>
                )}
                {thread.people.map((person) => (
                  <div key={person.key}
                    className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">
                      {person.characterName ? `${person.characterName} ·` : ''} *
                      {person.accountName ?? person.playerName}
                    </span>
                    <span className="shrink-0 tabular-nums">{person.messages.length}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
