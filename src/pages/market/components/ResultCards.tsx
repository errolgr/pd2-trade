import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ExternalLink, Heart, Loader2, MessageSquare, Shield, Sigma, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListingThumb } from '@/pages/chat/components/ListingCard';
import { useListingMarketPrices } from '@/pages/chat/hooks/useListingMarketPrices';
import { DealBadge } from '@/pages/market/enrich/DealBadge';
import type { Deal } from '@/pages/market/enrich/useDealIndicators';
import type { ItemDetail, MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { useListingActions } from '../hooks/useListingActions';
import { buildCardModel, modMatchesStatKey, SOCKET_SERIES, type CardMod, type SocketGroup } from '../lib/card-model';
import { listingAge, sellerAccount } from '../lib/listing';
import type { MarketApi, ScoredListing } from '../lib/types';
import { itemNameColor } from './ItemTooltip';
import { OfferButton, WhisperButton, iconActionClass } from './ListingActions';
import { OnlineDots, formatHrPrice } from './ResultsList';
import { formatStat, statWithValue } from './stat-text';

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

/** Theme variable of the item's quality colour (rune colour for runes and runewords). */
function qualityVar(item: Pick<ItemDetail, 'is_runeword' | 'name' | 'quality'>): string {
  if (item.is_runeword || / Rune$/.test(item.name)) return '--q-rune';
  switch (item.quality?.name) {
    case 'Unique':
      return '--q-unique';
    case 'Set':
      return '--q-set';
    case 'Rare':
      return '--q-rare';
    case 'Magic':
      return '--q-magic';
    case 'Crafted':
      return '--q-crafted';
    default:
      return '--q-normal';
  }
}

const seriesColor = (group: Pick<SocketGroup, 'series'>) => `var(${SOCKET_SERIES[group.series]})`;
/** "Ohm" for "Ohm Rune"; jewels and gems keep their name. */
const shortName = (name: string) => name.replace(/ Rune$/, '');

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

  const qVar = qualityVar(item);
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
        'cursor-default overflow-hidden rounded-lg border shadow-xs transition-[border-color,box-shadow] duration-(--dur-fast)',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-border/70 hover:border-ring/50',
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, var(${qVar}) 13%, var(--card)) 0%, var(--card) 45%)`,
      }}
    >
      {/* 1. Header */}
      <header className="flex gap-3 p-3 pb-2">
        <div
          className="flex h-[76px] w-16 shrink-0 items-center justify-center rounded-md border border-border/60"
          style={{
            background: `radial-gradient(circle at 50% 45%, color-mix(in oklab, var(${qVar}) 38%, transparent), transparent 72%)`,
          }}
        >
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
            {quality && (
              <span
                className={cn(pill, 'border-current/30', itemNameColor(item))}
                style={{ background: `color-mix(in oklab, var(${qVar}) 12%, transparent)` }}
              >
                {quality}
              </span>
            )}
            {item.socket_count > 0 && (
              <span className={cn(pill, 'border-border bg-secondary/60')}>{`${item.socket_count}os`}</span>
            )}
            {item.corrupted && (
              <span className={cn(pill, 'border-destructive/40 bg-destructive/15 text-q-corrupted')}>Corrupted</span>
            )}
            {item.is_ethereal && <span className={cn(pill, 'border-info/35 bg-info/10 text-info')}>Ethereal</span>}
            {item.item_level > 0 && (
              <span className={cn(pill, 'border-border/70 text-muted-foreground')}>{`ilvl ${item.item_level}`}</span>
            )}
          </div>
        </div>
        <div className="flex max-w-[40%] shrink-0 flex-col items-end gap-1 text-right">
          <span
            className={cn(
              'max-w-full truncate font-bold tabular-nums',
              price ? 'text-xl text-q-gold' : 'text-sm text-foreground',
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
          {model.overallRoll !== null && (
            <span
              className={cn(
                'tabular-nums',
                model.overallRoll === 100 ? 'font-semibold text-success' : 'text-muted-foreground',
              )}
            >
              {model.overallRoll === 100 ? 'Overall roll 100% · perfect' : `Overall roll ${model.overallRoll}%`}
            </span>
          )}
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
            line={m}
            groups={model.groups}
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
                className="inline-flex h-5 items-center gap-0.5 rounded-sm bg-info/10 px-1.5 text-[11px] tabular-nums text-info"
              >
                <Sigma className="size-3" />
                {statWithValue(key, row.pseudo[key] ?? 0, { short: true })}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Socketed */}
      {(model.groups.length > 0 || model.emptySockets > 0) && (
        <SocketSection
          groupListings={groupListings}
          groups={model.groups}
          socketGroups={model.socketGroups}
          emptySockets={model.emptySockets}
          hovered={hovered}
          onHover={setHovered}
          groupHr={groupHr}
        />
      )}

      {/* 5. Footer */}
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/50 px-3 py-2 text-xs">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-muted-foreground">
          <OnlineDots listing={listing} />
          {account && <span className="font-semibold text-foreground">{account}</span>}
          {item.character_id && <span>{`In game as ${item.character_id}`}</span>}
          <span className="tabular-nums">{listingAge(listing)}</span>
          <span>{`${listing.is_hardcore ? 'HC' : 'SC'} · ${listing.is_ladder ? 'Ladder' : 'NL'}`}</span>
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
            <OfferButton api={api}
              listing={listing}
              onWebsite={actions.openWebsite}
              dense
              openNonce={offerNonce} />
          )}
        </span>
      </footer>
    </article>
  );
});

/** A socket group's tag in a mod breakdown ("Ohm×2"), in the group's series colour. */
function SourceTag({
  group,
  index,
  onHover,
}: {
  group: SocketGroup;
  index: number;
  onHover: (g: number | null) => void;
}) {
  const color = seriesColor(group);
  return (
    <span
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      className="mx-0.5 inline-flex h-4 items-center rounded-sm border px-1 align-middle text-[10px] font-medium leading-none"
      style={{
        borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
        color,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      {`${shortName(group.name)}${group.items.length > 1 ? `×${group.items.length}` : ''}`}
    </span>
  );
}

function ModLine({
  line,
  groups,
  matched,
  highlighted,
  onHoverGroup,
}: {
  line: CardMod;
  groups: SocketGroup[];
  matched: boolean;
  highlighted: boolean;
  onHoverGroup: (g: number | null) => void;
}) {
  const { mod, own, ownKind, sources, socketOnly, rollPct } = line;
  const tags = sources.map((s, i) => (
    <React.Fragment key={s.group}>
      {i > 0 && ' + '}
      {!socketOnly && `${formatStat(s.amount)} `}
      <SourceTag group={groups[s.group]}
        index={s.group}
        onHover={onHoverGroup} />
    </React.Fragment>
  ));
  let breakdown: React.ReactNode = null;
  if (socketOnly) {
    breakdown = <> from {tags}</>;
  } else if (sources.length && own !== null) {
    const ownText =
      ownKind === 'roll'
        ? `${formatStat(own)} roll [${mod.min} – ${mod.max}]`
        : ownKind === 'corruption'
          ? `${formatStat(own)} corruption`
          : formatStat(own);
    breakdown = (
      <>
        {` = ${ownText} + `}
        {tags}
      </>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-6 items-center gap-2 overflow-hidden rounded-sm px-2 py-0.5 text-[13px] transition-colors duration-(--dur-fast)',
        highlighted && 'bg-accent/60',
      )}
    >
      {rollPct !== null && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 rounded-sm bg-linear-to-r',
            rollPct === 100 ? 'from-success/5 to-success/20' : 'from-primary/5 to-primary/15',
          )}
          style={{ width: `${Math.max(rollPct, 2)}%` }}
        />
      )}
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
        {line.perLevel && <span className="text-muted-foreground"> per level</span>}
        {breakdown && <span className="text-xs font-normal text-muted-foreground">{breakdown}</span>}
      </span>
      {rollPct === 100 ? (
        <span className="relative shrink-0 rounded-full bg-success/15 px-1.5 text-[10px] font-bold tracking-wider text-success">
          PERFECT
        </span>
      ) : rollPct !== null ? (
        <span className="relative shrink-0 text-[11px] tabular-nums text-muted-foreground">{`${rollPct}%`}</span>
      ) : matched ? (
        <span className="relative shrink-0 text-[11px] text-primary">✓ filter</span>
      ) : null}
    </div>
  );
}

function SocketSection({
  groupListings,
  groups,
  socketGroups,
  emptySockets,
  hovered,
  onHover,
  groupHr,
}: {
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
        <span className="text-xs font-semibold text-q-gold">{`Socketed (${filled})`}</span>
        <span className="flex items-center gap-1">
          {socketGroups.map((g, socket) => (
            <span
              key={socket}
              onMouseEnter={() => onHover(g)}
              className={cn(
                'flex size-7 items-center justify-center rounded-full border-2 bg-background/60 transition-transform duration-(--dur-fast)',
                hovered === g && 'scale-110',
              )}
              style={{ borderColor: seriesColor(groups[g]) }}
              title={groups[g].name}
            >
              <ListingThumb
                listing={groupListings[g]}
                className="size-full rounded-full border-0 bg-none shadow-none"
                artClassName="max-h-5 max-w-5"
              />
            </span>
          ))}
          {Array.from({ length: emptySockets }, (_, i) => (
            <span key={`empty-${i}`}
              className="size-7 rounded-full border-2 border-dashed border-border" />
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
                'min-w-0 rounded-md border border-l-[3px] bg-background/40 px-2 py-1 text-[11px] transition-colors duration-(--dur-fast)',
                hovered === g && 'bg-accent/50',
              )}
              style={{
                borderColor: `color-mix(in oklab, ${seriesColor(group)} 35%, transparent)`,
                borderLeftColor: seriesColor(group),
              }}
            >
              <div className="flex items-baseline gap-1.5">
                <span className={cn('truncate font-semibold', itemNameColor(group.items[0]))}>
                  {`${group.items.length} × ${group.name}`}
                </span>
                {values[g] !== null && (
                  <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{`~${formatStat(values[g] ?? 0)} HR`}</span>
                )}
              </div>
              {group.subtitle && <div className="text-[10px] text-muted-foreground">{group.subtitle}</div>}
              {group.lines.map((l, i) => (
                <div
                  key={i}
                  className="truncate text-q-magic"
                  title={l.total ? `${l.each} each · ${l.total} total` : l.each}
                >
                  {l.each}
                  {l.total && <span className="text-muted-foreground">{` each · ${l.total} total`}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
