import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Bell,
  Clock,
  ExternalLink,
  Gamepad2,
  Heart,
  Loader2,
  MessageSquare,
  Shield,
  Sigma,
  Swords,
  X,
} from 'lucide-react';
import { isUserOnlineIngame } from '@/lib/user-online-status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ListingThumb } from '@/pages/chat/components/ListingCard';
import { useListingMarketPrices } from '@/pages/chat/hooks/useListingMarketPrices';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { ItemDetail, MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { JewelElement } from '@/pages/chat/lib/listing-art';
import { useListingActions } from '../hooks/useListingActions';
import { buildCardModel, modMatchesStatKey, type CardMod, type SocketGroup } from '../lib/card-model';
import { listingAge, sellerAccount } from '../lib/listing';
import type { MarketApi, ScoredListing } from '../lib/types';
import { itemNameColor } from './ItemTooltip';
import { OfferButton, WhisperButton, iconActionClass } from './ListingActions';
import { OnlineDots, formatHrPrice } from './ResultsList';
import { formatStat, statWithValue } from './stat-text';
import { AddAllModsButton, ModMenu } from './ModMenu';

const ESTIMATED_CARD_HEIGHT = 340;
const GAP = 8;
const PADDING = 8;
/** Cards from the end at which the next server page is requested. */
const LOAD_MORE_AHEAD = 3;

/** A hotkey for the selected card (O offer, W whisper, F favorite); `nonce` makes repeats distinct. */
export interface CardCommand {
  id: string;
  action: 'offer' | 'whisper' | 'favorite';
  nonce: number;
}

/** An alert listing pinned at the top of the cards ("From alert: <search>"). */
export interface CardPin {
  id: string;
  searchName?: string;
  onDismiss: () => void;
}

export interface ResultCardsProps {
  rows: ScoredListing[];
  selectedId: string | null;
  /** Click: select (the card is self-contained; no detail pane needed). */
  onSelect: (listingId: string) => void;
  /** Double click: open the detail pane anyway. */
  onOpen: (listingId: string) => void;
  deals: ReadonlyMap<string, Deal>;
  pseudoKeys: string[];
  /** Enabled mod filter keys: matching lines are marked. */
  statKeys: string[];
  showScore: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (listing: MarketListingEntry) => void;
  /** Sold archive: no offer/whisper. */
  archived: boolean;
  api: MarketApi | null;
  command: CardCommand | null;
  /** An alert's listing pinned above the results (not in them): labelled and dismissable. */
  pinned?: CardPin | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

/** Full-width result cards, one per row, virtualized (cards vary in height, so each is measured). */
export function ResultCards({
  rows,
  selectedId,
  onSelect,
  onOpen,
  deals,
  pseudoKeys,
  statKeys,
  showScore,
  favoriteIds,
  onToggleFavorite,
  archived,
  api,
  command,
  pinned,
  hasMore,
  loadingMore,
  onLoadMore,
}: ResultCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- no React Compiler; the virtualizer re-renders us
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () =>
      containerRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]') ?? null,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    getItemKey: (index) => rows[index].listing._id,
    overscan: 3,
    paddingStart: PADDING,
    paddingEnd: PADDING,
    gap: GAP,
  });

  // Keep the keyboard selection in view
  const selectedIndex = selectedId ? rows.findIndex((r) => r.listing._id === selectedId) : -1;
  useEffect(() => {
    if (selectedIndex >= 0) virtualizer.scrollToIndex(selectedIndex, { align: 'auto' });
  }, [selectedIndex, virtualizer]);

  // Infinite load: the last rendered card is near the end
  const lastVisible = virtualizer.getVirtualItems().at(-1)?.index ?? -1;
  useEffect(() => {
    if (hasMore && !loadingMore && rows.length > 0 && lastVisible >= rows.length - LOAD_MORE_AHEAD) onLoadMore();
  }, [hasMore, loadingMore, lastVisible, rows.length, onLoadMore]);

  return (
    <ScrollArea
      ref={containerRef}
      className="min-h-0 flex-1 overflow-hidden [&_[data-radix-scroll-area-viewport]>div]:!block"
    >
      <div
        role="listbox"
        aria-label="Listings"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          const id = row.listing._id;
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute left-0 top-0 w-full"
              style={{ transform: `translateY(${item.start}px)`, paddingInline: PADDING }}
            >
              <ResultCard
                row={row}
                selected={id === selectedId}
                onSelect={onSelect}
                onOpen={onOpen}
                deal={deals.get(id)}
                pseudoKeys={pseudoKeys}
                statKeys={statKeys}
                showScore={showScore}
                favorite={favoriteIds.has(id)}
                onToggleFavorite={onToggleFavorite}
                archived={archived}
                api={api}
                // Only the selected card gets hotkeys (the others keep their memoized props)
                command={command && command.id === id ? command : null}
                pin={pinned && pinned.id === id ? pinned : null}
              />
            </div>
          );
        })}
      </div>
      {loadingMore && (
        <div aria-busy
          className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading more…
        </div>
      )}
    </ScrollArea>
  );
}

/** "Ohm" for "Ohm Rune"; jewels and gems keep their name. */
const shortName = (name: string) => name.replace(/ Rune$/, '');
/** Most socket icons a breakdown stacks (the tooltip lists every source). */
const MAX_STACK_ICONS = 6;

/** Rainbow Facet names in their element's colour (the game's elemental hues; themes have no element tokens). */
const ELEMENT_TEXT: Record<JewelElement, string> = {
  fire: 'text-[#ff7043]',
  cold: 'text-[#6aa8ff]',
  lightning: 'text-[#f2cf4a]',
  poison: 'text-[#62c75f]',
};
const groupNameColor = (group: SocketGroup) =>
  group.element ? ELEMENT_TEXT[group.element] : itemNameColor(group.items[0]);

/** A socketable's art in a small ring; `className` overrides the 14px size. */
function SocketIcon({ listing, className }: { listing: MarketListingEntry; className?: string }) {
  return (
    <ListingThumb
      listing={listing}
      className={cn('size-3.5 rounded-full border border-border bg-muted/80 shadow-none ring-1 ring-card', className)}
      artClassName="max-h-[85%] max-w-[85%]"
    />
  );
}

const pill = 'inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium leading-none';

const ResultCard = React.memo(function ResultCard({
  row,
  selected,
  onSelect,
  onOpen,
  deal,
  pseudoKeys,
  statKeys,
  showScore,
  favorite,
  onToggleFavorite,
  archived,
  api,
  command,
  pin,
}: {
  row: ScoredListing;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  deal: Deal | undefined;
  pseudoKeys: string[];
  statKeys: string[];
  showScore: boolean;
  favorite: boolean;
  onToggleFavorite: (listing: MarketListingEntry) => void;
  archived: boolean;
  api: MarketApi | null;
  command: CardCommand | null;
  pin: CardPin | null;
}) {
  const { listing } = row;
  const { item } = listing;
  const model = useMemo(() => buildCardModel(item), [item]);
  const actions = useListingActions(listing);
  const [hovered, setHovered] = useState<number | null>(null);

  // Socket prices (runes, priced uniques…) through the economy service, one pseudo-listing per group
  const groupListings = useMemo(
    () => model.groups.map((g, i) => ({ ...listing, _id: `${listing._id}#socket${i}`, item: g.items[0] })),
    [model.groups, listing],
  );
  const groupPrices = useListingMarketPrices(groupListings);
  const groupHr = (i: number) => {
    const price = groupPrices.get(groupListings[i]._id);
    return price ? price.hr * model.groups[i].items.length : null;
  };

  // Hotkeys for the selected card. The offer form opens through its nonce (adjusted during render); favorite
  // and whisper run once per command nonce.
  const [seenOfferNonce, setSeenOfferNonce] = useState<number | null>(null);
  const [offerNonce, setOfferNonce] = useState<number | undefined>(undefined);
  if (command?.action === 'offer' && command.nonce !== seenOfferNonce) {
    setSeenOfferNonce(command.nonce);
    if (!archived) setOfferNonce(command.nonce);
  }
  const handledNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!command || command.action === 'offer' || command.nonce === handledNonce.current) return;
    handledNonce.current = command.nonce;
    if (command.action === 'favorite') onToggleFavorite(listing);
    else if (!archived) void actions.copyWhisper();
  }, [command, onToggleFavorite, listing, archived, actions]);

  const price = formatHrPrice(listing.hr_price);
  const quality = item.is_runeword ? 'Runeword' : (item.quality?.name ?? '');
  const handType = item.damage?.two_handed ? 'Two-Hand' : item.damage?.one_handed ? 'One-Hand' : null;
  const subtitle = [
    [quality, item.base?.name && item.base.name !== item.name ? item.base.name : null].filter(Boolean).join(' '),
    [handType, item.base?.type].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' · ');
  const req = item.requirements;
  const account = sellerAccount(listing) || listing.user?.username;

  return (
    <article
      role="option"
      aria-selected={selected}
      data-listing-id={listing._id}
      onClick={() => onSelect(listing._id)}
      onDoubleClick={() => onOpen(listing._id)}
      className={cn(
        'cursor-default overflow-hidden rounded-lg border bg-foreground/[0.015] transition-colors duration-(--dur-fast)',
        selected ? 'border-primary' : 'border-border/60 hover:border-border',
        pin && 'ring-2 ring-primary/30',
      )}
    >
      {pin && (
        <div className="flex items-center gap-1.5 border-b border-primary/30 bg-primary/10 px-3 py-1 text-[11px] text-primary">
          <Bell className="size-3 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {pin.searchName ? `From alert: ${pin.searchName}` : 'From alert'}
            <span className="text-muted-foreground"> · not in the current results</span>
          </span>
          <button
            type="button"
            aria-label="Dismiss alert listing"
            title="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              pin.onDismiss();
            }}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-primary/15 hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      {/* 1. Header */}
      <header className="flex gap-3 p-3 pb-2">
        <div className="flex h-[76px] w-16 shrink-0 items-center justify-center rounded-md border border-border/50">
          <ListingThumb
            listing={listing}
            className="size-full border-0 bg-none shadow-none"
            artClassName="max-h-[68px] max-w-14"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn('truncate text-sm font-bold uppercase tracking-[0.08em]', itemNameColor(item))}
            title={item.name}
          >
            {item.name}
          </h3>
          {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {quality && <span className={cn(pill, 'border-border/70', itemNameColor(item))}>{quality}</span>}
            {item.socket_count > 0 && (
              <span className={cn(pill, 'border-border/70 text-muted-foreground')}>{`${item.socket_count}os`}</span>
            )}
            {item.corrupted && <span className={cn(pill, 'border-border/70 text-q-corrupted')}>Corrupted</span>}
            {item.is_ethereal && <span className={cn(pill, 'border-border/70 text-muted-foreground')}>Ethereal</span>}
            {item.item_level > 0 && (
              <span className={cn(pill, 'border-border/70 text-muted-foreground')}>{`ilvl ${item.item_level}`}</span>
            )}
            <AddAllModsButton
              item={item}
              label="Filter all mods"
              className={cn(
                pill,
                'cursor-pointer gap-1 border-dashed border-border/70 text-muted-foreground hover:border-border hover:text-foreground',
              )}
            />
          </div>
        </div>
        <div className="flex max-w-[40%] shrink-0 flex-col items-end gap-1 text-right">
          <span
            className={cn(
              'max-w-full truncate font-bold tabular-nums',
              price ? 'text-xl text-foreground' : 'text-sm text-foreground',
            )}
            title={listing.price || undefined}
          >
            {price ?? (listing.price || 'No price')}
          </span>
          {price && listing.price && (
            <span className="max-w-full truncate text-[11px] text-muted-foreground"
              title={listing.price}>
              {`note: "${listing.price}"`}
            </span>
          )}
          <DealBadge deal={deal} />
        </div>
      </header>

      {/* 2. Stats strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 px-3 py-1.5 text-xs">
        {item.damage?.two_handed && (
          <span className="inline-flex items-center gap-1.5">
            <Swords className="size-3.5 text-muted-foreground" />
            Two-Hand Damage
            <span className="font-semibold tabular-nums">{`${item.damage.two_handed.minimum} – ${item.damage.two_handed.maximum}`}</span>
          </span>
        )}
        {item.damage?.one_handed && (
          <span className="inline-flex items-center gap-1.5">
            <Swords className="size-3.5 text-muted-foreground" />
            One-Hand Damage
            <span className="font-semibold tabular-nums">{`${item.damage.one_handed.minimum} – ${item.damage.one_handed.maximum}`}</span>
          </span>
        )}
        {item.defense && item.defense.total > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5 text-muted-foreground" />
            Defense <span className="font-semibold tabular-nums">{item.defense.total}</span>
          </span>
        )}
        <span className="flex gap-1">
          {req?.level > 0 && <span className={cn(pill, 'border-border/70')}>{`Lvl ${req.level}`}</span>}
          {req?.strength > 0 && <span className={cn(pill, 'border-border/70')}>{`Str ${req.strength}`}</span>}
          {req?.dexterity > 0 && <span className={cn(pill, 'border-border/70')}>{`Dex ${req.dexterity}`}</span>}
        </span>
        <span className="ml-auto flex items-center gap-3">
          {showScore && row.score !== null && (
            <span
              className="font-semibold tabular-nums text-primary"
              title={row.value !== null ? `Value ${formatStat(row.value)} per HR` : undefined}
            >
              {`Score ${formatStat(row.score)}`}
            </span>
          )}
        </span>
      </div>

      {/* 3. Mods, in game order */}
      <div className="space-y-px border-t border-border/50 px-1.5 py-1.5">
        {model.mods.map((m, i) => (
          <ModLine
            key={`${m.mod.name}-${i}`}
            item={item}
            line={m}
            groups={model.groups}
            groupListings={groupListings}
            matched={statKeys.some((key) => modMatchesStatKey(m.mod, key))}
            highlighted={hovered !== null && m.sources.some((s) => s.group === hovered)}
            onHoverGroup={setHovered}
          />
        ))}
        {pseudoKeys.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1.5 pt-1">
            {pseudoKeys.map((key) => (
              <span
                key={key}
                title={statWithValue(key, row.pseudo[key] ?? 0)}
                className="inline-flex h-5 items-center gap-0.5 rounded-sm bg-muted/60 px-1.5 text-[11px] tabular-nums text-muted-foreground"
              >
                <Sigma className="size-3" />
                {statWithValue(key, row.pseudo[key] ?? 0, { short: true })}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Socketed (only when a socketed item lists a bonus; the `Nos` pill covers the rest) */}
      {model.showSockets && (
        <SocketSection
          item={item}
          groupListings={groupListings}
          groups={model.groups}
          socketGroups={model.socketGroups}
          emptySockets={model.emptySockets}
          hovered={hovered}
          onHover={setHovered}
          groupHr={groupHr}
        />
      )}

      {/* 5. Footer: a quiet strip like the chat trader card's action bar */}
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/60 bg-foreground/[0.045] px-3 py-1.5 text-xs">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
          {/* Who: presence + account, with the character they're on */}
          <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 pl-2 pr-2.5">
            <OnlineDots listing={listing} />
            {account && <span className="truncate font-semibold text-foreground">{account}</span>}
            {item.character_id && (
              <>
                <span aria-hidden
                  className="h-3 w-px bg-border" />
                <span
                  className="inline-flex min-w-0 items-center gap-1 text-muted-foreground"
                  title={`In game as ${item.character_id}`}
                >
                  <Gamepad2
                    className={cn('size-3 shrink-0', isUserOnlineIngame(listing.user_last_ingame) && 'text-success')}
                  />
                  <span className="truncate">{item.character_id}</span>
                </span>
              </>
            )}
          </span>
          {/* When / where */}
          <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums"
              title="Last bumped">
              <Clock className="size-3" />
              {listingAge(listing)}
            </span>
            <span className="rounded border border-border/60 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide">
              {`${listing.is_hardcore ? 'HC' : 'SC'} · ${listing.is_ladder ? 'Ladder' : 'Non-ladder'}`}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1"
          onDoubleClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(iconActionClass, favorite && 'text-destructive hover:text-destructive')}
            aria-pressed={favorite}
            aria-label={favorite ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
            title={favorite ? 'Remove from favorites (F)' : 'Add to favorites (F)'}
            onClick={() => onToggleFavorite(listing)}
          >
            <Heart className={cn('size-3.5', favorite && 'fill-current')} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={iconActionClass}
            aria-label="Message seller"
            title="Message seller"
            onClick={actions.openDm}
          >
            <MessageSquare className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={iconActionClass}
            aria-label="Open on projectdiablo2.com"
            title="Open on projectdiablo2.com"
            onClick={actions.openWebsite}
          >
            <ExternalLink className="size-3.5" />
          </Button>
          {!archived && <WhisperButton actions={actions}
            dense />}
          {!archived && (
            <OfferButton
              api={api}
              listing={listing}
              onWebsite={actions.openWebsite}
              dense
              openNonce={offerNonce}
              ensureFresh={actions.ensureFresh}
            />
          )}
        </span>
      </footer>
    </article>
  );
});

/**
 * What sockets add to a line, compact: `413 + 235` (or `80 corr + 20`, or `from`) and an overlapping stack of the
 * contributing socketables' icons; the tooltip lists each source with its amount.
 */
function SourceSuffix({
  line,
  groups,
  groupListings,
  onHoverGroup,
}: {
  line: CardMod;
  groups: SocketGroup[];
  groupListings: MarketListingEntry[];
  onHoverGroup: (g: number | null) => void;
}) {
  const { mod, own, ownKind, sources, socketOnly } = line;
  const added = sources.reduce((sum, s) => sum + s.amount, 0);
  const ownText = own === null ? '' : ownKind === 'corruption' ? `${formatStat(own)} corr` : formatStat(own);
  const icons = sources.flatMap((s) => groups[s.group].items.map(() => s.group)).slice(0, MAX_STACK_ICONS);
  const ownLabel =
    own === null || socketOnly
      ? null
      : ownKind === 'roll'
        ? `${formatStat(own)} roll [${mod.min} – ${mod.max}]`
        : ownKind === 'corruption'
          ? `${formatStat(own)} corruption`
          : `${formatStat(own)} item`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="ml-1.5 inline-flex items-center gap-1 rounded-sm align-middle text-xs font-normal text-muted-foreground outline-none tabular-nums focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {socketOnly ? 'from' : `${ownText} + ${formatStat(added)}`}
          <span className="inline-flex items-center pl-0.5">
            {icons.map((g, i) => (
              <span
                key={i}
                className={cn(i > 0 && '-ml-1')}
                onMouseEnter={() => onHoverGroup(g)}
                onMouseLeave={() => onHoverGroup(null)}
              >
                <SocketIcon listing={groupListings[g]} />
              </span>
            ))}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top"
        align="start"
        className="space-y-1 text-[11px]">
        {ownLabel && <div className="text-muted-foreground">{ownLabel}</div>}
        {sources.map((s) => {
          const group = groups[s.group];
          return (
            <div key={s.group}
              className="flex items-center gap-1.5">
              <SocketIcon listing={groupListings[s.group]}
                className="size-4" />
              <span className={groupNameColor(group)}>
                {`${group.items.length > 1 ? `${group.items.length} × ` : ''}${shortName(group.name)}`}
              </span>
              <span className="ml-auto pl-3 font-semibold tabular-nums">{`+${formatStat(s.amount)}`}</span>
            </div>
          );
        })}
      </TooltipContent>
    </Tooltip>
  );
}

function ModLine({
  item,
  line,
  groups,
  groupListings,
  matched,
  highlighted,
  onHoverGroup,
}: {
  item: ItemDetail;
  line: CardMod;
  groups: SocketGroup[];
  groupListings: MarketListingEntry[];
  matched: boolean;
  highlighted: boolean;
  onHoverGroup: (g: number | null) => void;
}) {
  const { mod, own, sources, socketOnly } = line;
  const hasRange = mod.min !== undefined && mod.max !== undefined && mod.min !== mod.max;
  const split = sources.length > 0 && (socketOnly || own !== null);

  return (
    <ModMenu
      mod={mod}
      item={item}
      className={cn(
        'relative flex min-h-6 items-center gap-2 overflow-hidden rounded-sm px-2 py-0.5 text-[13px] transition-colors duration-(--dur-fast)',
        highlighted && 'bg-muted/60',
      )}
    >
      {matched && <span aria-hidden
        className="absolute inset-y-0.5 left-0 w-[3px] rounded-full bg-primary" />}
      <span
        className={cn(
          'relative min-w-0 flex-1',
          line.corrupted ? 'text-q-corrupted' : 'text-q-magic',
          matched && 'font-semibold',
        )}
      >
        {line.label}
        {hasRange && <span className="text-muted-foreground">{` [${mod.min} – ${mod.max}]`}</span>}
        {line.perLevel && <span className="text-muted-foreground"> per level</span>}
        {split && (
          <SourceSuffix line={line}
            groups={groups}
            groupListings={groupListings}
            onHoverGroup={onHoverGroup} />
        )}
      </span>
      {matched && <span className="relative shrink-0 text-[11px] text-primary">✓ filter</span>}
    </ModMenu>
  );
}

function SocketSection({
  item,
  groupListings,
  groups,
  socketGroups,
  emptySockets,
  hovered,
  onHover,
  groupHr,
}: {
  /** The listed item (its pseudo totals feed the line menus). */
  item: ItemDetail;
  /** The card's listing with each group's item swapped in (art + prices). */
  groupListings: MarketListingEntry[];
  groups: SocketGroup[];
  socketGroups: number[];
  emptySockets: number;
  hovered: number | null;
  onHover: (g: number | null) => void;
  groupHr: (g: number) => number | null;
}) {
  const filled = socketGroups.length;
  const values = groups.map((_, i) => groupHr(i));
  const total = values.length > 0 && values.every((v) => v !== null) ? values.reduce((s, v) => s + (v ?? 0), 0) : null;
  const columns = Math.min(Math.max(groups.length, 1), 3);
  return (
    <section className="border-t border-border/50 px-3 py-2"
      onMouseLeave={() => onHover(null)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{`Socketed (${filled})`}</span>
        <span className="flex items-center gap-1">
          {socketGroups.map((g, socket) => (
            <span
              key={socket}
              onMouseEnter={() => onHover(g)}
              className={cn(
                'flex size-6 items-center justify-center rounded-full border bg-muted/30 transition-colors duration-(--dur-fast)',
                hovered === g ? 'border-foreground/50' : 'border-border',
              )}
              title={groups[g].name}
            >
              <ListingThumb
                listing={groupListings[g]}
                className="size-full rounded-full border-0 bg-none shadow-none"
                artClassName="max-h-[18px] max-w-[18px]"
              />
            </span>
          ))}
          {Array.from({ length: emptySockets }, (_, i) => (
            <span key={`empty-${i}`}
              className="size-6 rounded-full border border-dashed border-border" />
          ))}
        </span>
        {emptySockets > 0 && (
          <span className="text-[11px] text-muted-foreground">{`${emptySockets} empty socket${emptySockets > 1 ? 's' : ''}`}</span>
        )}
        {total !== null && total > 0 && (
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{`~${formatStat(total)} HR of sockets`}</span>
        )}
      </div>
      {groups.length > 0 && (
        <div className="mt-1.5 grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {groups.map((group, g) => (
            <div
              key={group.key}
              onMouseEnter={() => onHover(g)}
              className={cn(
                'min-w-0 rounded-md border border-border/60 px-2 py-1 text-[11px] transition-colors duration-(--dur-fast)',
                hovered === g && 'bg-muted/50',
              )}
            >
              <div className="flex items-center gap-1.5">
                <SocketIcon listing={groupListings[g]}
                  className="size-7" />
                <span className={cn('truncate text-[12px] font-semibold', groupNameColor(group))}>
                  {group.items.length > 1 ? `${group.items.length} × ${group.name}` : group.name}
                </span>
                {values[g] !== null && (
                  <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{`~${formatStat(values[g] ?? 0)} HR`}</span>
                )}
              </div>
              {group.subtitle && <div className="pl-[26px] text-[10px] text-muted-foreground">{group.subtitle}</div>}
              {group.lines.length > 0 && (
                <div className="mt-0.5 ml-[9px] space-y-px border-l border-border/60 pl-2">
                  {group.lines.map((l, i) => {
                    const text = (
                      <>
                        {l.each}
                        {l.total && <span className="text-muted-foreground">{` each · ${l.total} total`}</span>}
                      </>
                    );
                    const lineClass = 'truncate rounded-sm text-[11px] text-q-magic/80';
                    // Flag-only lines (Zod's Indestructible) have no mod to filter on
                    const mod = group.mods[i];
                    return mod ? (
                      <ModMenu key={i}
                        mod={mod}
                        item={item}
                        socketLine
                        className={lineClass}>
                        {text}
                      </ModMenu>
                    ) : (
                      <div key={i}
                        className={lineClass}>
                        {text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
