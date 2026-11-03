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
import {
  Button,
  DataRow,
  ItemName,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PriceTag,
  ScrollArea,
  Skeleton,
  cn,
} from '@pd2-trader/ui';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { t as tGlobal, useTranslation } from '@/i18n';
import { writeText } from '@/lib/browser-clipboard';
import { openUrl } from '@/lib/browser-opener';
import { showToast, useOverlay } from '@/overlay';
import { whisperTarget } from '@/lib/whisper-history';
import { type ChatListingState, useChatListings } from '../hooks/useChatListings';
import { type ListingMarketPrice, useListingMarketPrices } from '../hooks/useListingMarketPrices';
import { presenceLabel, shortAgo, type TraderProfile } from '../hooks/useTraderProfile';
import type { InboxThread } from '../lib/inbox';
import { ListingDetails, listingItemName, ListingThumb, marketDelta } from './ListingCard';
import { dealStatusLabel, OfferHoverCard, offerStatus, STATUS_CLASS } from './ThreadDeals';
import { characterUrl, ChatAvatar, marketUrl, profileUrl, Tip } from './chat-parts';

/** Their listings shown in the grid; the rest are behind "N more" (their market on the website). */
const MARKET_GRID_LIMIT = 8;

/** The asking price: its HR value, else the seller's note ("2 ist"), else a dash. */
const askingPrice = (listing: MarketListingEntry): React.ReactNode =>
  listing.hr_price > 0 ? <PriceTag amount={listing.hr_price}
    unit="hr" /> : listing.price || '—';

/** Copies `*account` (what goes after /w in the game chat). */
async function copyAccount(account: string) {
  try {
    await writeText(`*${account}`);
    showToast({
      title: tGlobal('chat:trader.copiedAccount', { account }),
      description: tGlobal('chat:trader.copiedAccountDescription'),
    });
  } catch {
    showToast({
      title: tGlobal('chat:trader.notCopied'),
      description: tGlobal('chat:bubble.copyFailedDescription'),
      variant: 'error',
    });
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
      <h4 className="flex items-center gap-1.5 px-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="flex-1">{title}</span>
        {aside}
      </h4>
      {children}
    </section>
  );
}

/** Extras on the profile card's ghost `icon-sm` action Buttons. */
const actionButtonClass = 'text-muted-foreground hover:bg-primary/10 hover:text-foreground';

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
  const { t } = useTranslation('chat');
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="inline"
          aria-label={t('trader.linkInMessage', { item: listing.item.name })}
          onClick={(e) => {
            // A click links it; the popover is for hovering (keep Radix from toggling it open)
            e.preventDefault();
            setOpen(false);
            onInsert(listing);
          }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="group/tile min-w-0 flex-col gap-1 rounded-lg border border-border/60 bg-linear-to-b from-background/70 to-background/30 p-1.5 shadow-xs transition-[border-color,transform,box-shadow] hover:-translate-y-px hover:border-primary/40 hover:bg-transparent hover:shadow-sm"
        >
          <ListingThumb
            listing={listing}
            className="size-10 border-0 bg-transparent shadow-none"
            artClassName="max-h-9 max-w-9 transition-transform duration-(--dur-fast) group-hover/tile:scale-110"
          />
          <span className="w-full truncate text-center text-3xs font-semibold tabular-nums text-foreground/85">
            {askingPrice(listing)}
          </span>
        </Button>
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
          hint={t('trader.clickToLink')} />
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
  const { t } = useTranslation('chat');
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
        <span className="sr-only">{t('trader.loadingListings')}</span>
        {Array.from({ length: MARKET_GRID_LIMIT }, (_, i) => (
          <Skeleton key={i}
            className="h-16.5 rounded-lg" />
        ))}
      </div>
    );
  } else if (grid.length === 0) {
    market = (
      <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
        {profile.status === 'error' ? t('trader.listingsFailed') : t('trader.noListings')}
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
        <p className="px-0.5 text-2xs text-muted-foreground">{t('trader.clickItemHint')}</p>
        {thread.userId && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() =>
              openPanel('market', {
                filters: { sellerUserId: thread.userId, sellerName: username ?? thread.name },
                tab: 'search',
              })
            }
            className="h-7 w-full gap-1.5 rounded-md border border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          >
            <Store className="size-3.5" />
            {t('trader.browseAll')}
          </Button>
        )}
      </>
    );
  }

  return (
    <aside
      aria-label={t('trader.title')}
      className={cn(
        'flex min-h-0 w-sidebar shrink-0 flex-col overflow-hidden border-l border-border bg-card/40',
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-3">
        <UserRound className="size-4 text-muted-foreground" />
        <span className="flex-1 text-sm font-semibold tracking-tight">{t('trader.title')}</span>
        <Tip label={closeLabel}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={closeLabel}
            onClick={onClose}
            className="text-muted-foreground"
          >
            <PanelRightClose className="size-4" />
          </Button>
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
                className="size-11 shrink-0 text-base shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold leading-tight text-foreground">{thread.name}</h4>
                {username ? (
                  <Button
                    type="button"
                    variant="quiet"
                    size="inline"
                    onClick={() => openUrl(profileUrl(username))}
                    className="max-w-full rounded-sm text-xs font-normal hover:text-primary"
                  >
                    <span className="truncate">@{username}</span>
                    <ExternalLink aria-hidden
                      className="size-3 shrink-0" />
                  </Button>
                ) : (
                  // A website user without a known username (a market seller messaged from the market) is still linked
                  !thread.userId && (
                    <span className="block truncate text-xs text-muted-foreground">{t('trader.notLinked')}</span>
                  )
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted-foreground">
                  {presence}
                  {joined?.isValid() && (
                    <span className="flex items-center gap-1">
                      <CalendarDays aria-hidden
                        className="size-3" />
                      {t('trader.joined', { date: joined.format('MMM YYYY') })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {accounts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {accounts.map((account) => (
                  <Tip key={account}
                    label={t('trader.accountTip', { account })}>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      aria-label={t('trader.copyAccount', { account })}
                      onClick={() => void copyAccount(account)}
                      className="h-auto max-w-full rounded-full border-border/70 bg-background/60 px-2 py-0.5 text-foreground/90 shadow-none hover:border-primary/40 hover:bg-primary/10 hover:text-foreground/90 has-[>svg]:px-2"
                    >
                      <Gamepad2 aria-hidden
                        className="size-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">*{account}</span>
                    </Button>
                  </Tip>
                ))}
              </div>
            )}

            {/* Actions: a footer row of icon buttons; labels live in tooltips so the row never crowds */}
            <div className="-mx-3 -mb-3 mt-3 flex items-center justify-center gap-1 border-t border-border/60 bg-background/30 p-1">
              {username && (
                <>
                  <Tip label={t('trader.viewProfileTip')}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('trader.viewProfile')}
                      className={actionButtonClass}
                      onClick={() => openUrl(profileUrl(username))}
                    >
                      <UserRound className="size-3.5" />
                    </Button>
                  </Tip>
                  <Tip label={t('trader.theirMarketTip')}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('trader.theirMarket')}
                      className={actionButtonClass}
                      onClick={() => openUrl(marketUrl(username))}
                    >
                      <Store className="size-3.5" />
                    </Button>
                  </Tip>
                </>
              )}
              {characterName && (
                <Tip label={t('trader.viewCharacter')}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('trader.viewCharacter')}
                    className={actionButtonClass}
                    onClick={() => openUrl(characterUrl(characterName))}
                  >
                    <Swords className="size-3.5" />
                  </Button>
                </Tip>
              )}
              {characterName && (
                <Tip label={t('trader.viewBuildTip')}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('trader.viewBuild')}
                    className={actionButtonClass}
                    onClick={() => openPanel('builds', { character: { name: characterName } })}
                  >
                    <Shield className="size-3.5" />
                  </Button>
                </Tip>
              )}
              {whisperAccount && (
                <Tip label={t('trader.copyWhisperTip', { account: whisperAccount })}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('trader.copyWhisperTarget')}
                    className={actionButtonClass}
                    onClick={() => void copyAccount(whisperAccount)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </Tip>
              )}
            </div>
          </div>

          {/* Trade with you */}
          <Section icon={Handshake}
            title={t('trader.tradeWithYou')}>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { labelKey: 'trader.openOffers', value: openOffers },
                { labelKey: 'trader.linkedItems', value: linked.length },
              ].map(({ labelKey, value }) => (
                <div
                  key={labelKey}
                  className="rounded-lg border border-border/60 bg-linear-to-b from-background/60 to-background/20 px-2.5 py-1.5"
                >
                  <div className="text-base font-semibold leading-tight tabular-nums text-foreground">{value}</div>
                  <div className="text-2xs text-muted-foreground">{t(labelKey)}</div>
                </div>
              ))}
            </div>
            {offers.length > 0 && (
              <ul aria-label={t('trader.offersBetween')}
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
                          aria-label={offer.isIncoming ? t('trader.theirOffer') : t('deals.yourOffer')}
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {offer.itemName ?? t('deals.unknownItem')}
                        </span>
                        {offer.price && (
                          <span className="max-w-20 shrink-0 truncate font-semibold tabular-nums">{offer.price}</span>
                        )}
                        <span
                          className={cn(
                            'shrink-0 rounded-sm px-1 text-3xs font-medium uppercase tracking-wide',
                            STATUS_CLASS[status],
                          )}
                        >
                          {dealStatusLabel(status)}
                        </span>
                      </li>
                    </OfferHoverCard>
                  );
                })}
              </ul>
            )}
            {linked.length > 0 && (
              <ul aria-label={t('trader.linkedInChat')}
                className="space-y-1">
                {linked.map(({ listing, listed }) => {
                  const market = prices.get(listing._id);
                  const delta = market && listing.hr_price > 0 ? marketDelta(listing.hr_price, market.hr) : null;
                  return (
                    <li key={listing._id}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="row"
                        onClick={() => openUrl(`https://www.projectdiablo2.com/market/listing/${listing._id}`)}
                        className="min-w-0 rounded-lg px-1.5 py-1 hover:bg-accent/60 hover:text-foreground"
                      >
                        <ListingThumb listing={listing}
                          className={cn(!listed && 'opacity-50 grayscale')} />
                        <span className="min-w-0 flex-1">
                          <ItemName {...listingItemName(listing)}
                            className="block truncate text-xs font-semibold" />
                          <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                            <span className="truncate tabular-nums text-foreground/85">
                              {askingPrice(listing)}
                            </span>
                            {market && (
                              <span className="shrink-0 tabular-nums">
                                {t('trader.marketShort', { hr: Number(market.hr.toFixed(2)) })}
                              </span>
                            )}
                          </span>
                          {delta && <span className={cn('block text-2xs', delta.className)}>{delta.text}</span>}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-sm px-1 text-3xs font-medium uppercase tracking-wide',
                            listed ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {listed ? t('trader.listed') : t('listing.unlisted')}
                        </span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {offers.length === 0 && linked.length === 0 && (
              <p className="flex items-center gap-1.5 px-0.5 text-xs text-muted-foreground">
                <Link2 className="size-3.5" />
                {t('trader.nothingYet')}
              </p>
            )}
          </Section>

          {/* Their market */}
          {thread.userId && (
            <Section
              icon={PackageSearch}
              title={t('trader.theirMarket')}
              aside={
                profile.status === 'ready' &&
                profile.total > grid.length &&
                username && (
                  <Button
                    type="button"
                    variant="link"
                    size="inline"
                    onClick={() => openUrl(marketUrl(username))}
                    className="gap-0.5 rounded-sm font-semibold normal-case tracking-normal"
                  >
                    {t('deals.more', { count: profile.total - grid.length })}
                    <ExternalLink aria-hidden
                      className="size-3" />
                  </Button>
                )
              }
            >
              {market}
            </Section>
          )}

          {/* In-game */}
          {thread.people.length > 0 && (
            <Section icon={Gamepad2}
              title={t('trader.inGame')}>
              <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/30 px-2.5 py-2 text-xs">
                <DataRow
                  label={
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="size-3.5" />
                      {t('trader.whispers')}
                    </span>
                  }
                  value={whisperCount}
                  valueClassName="font-semibold"
                />
                {lastWhisper > 0 && (
                  <DataRow
                    label={t('trader.lastWhisper')}
                    value={
                      <span title={moment(lastWhisper).format('ddd, MMM D YYYY · h:mm A')}>
                        {shortAgo(lastWhisper, now)}
                      </span>
                    }
                  />
                )}
                {thread.people.map((person) => (
                  <div key={person.key}
                    className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground">
                      {person.characterName ? `${person.characterName} ·` : ''} *{whisperTarget(person)}
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
