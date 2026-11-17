import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, HandCoins, MessageSquare, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tip } from '@/components/ui/tooltip';
import { useOverlay } from '@/overlay';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { useNow } from '@/pages/market/enrich/useNow';
import { t as translate, useTranslation } from '@/i18n';
import type { WtbContactItem, WtbSort } from '../alerts/wtb-api';
import { iconActionClass } from '../components/ListingActions';
import { ROW_HEIGHT } from '../components/ResultsList';
import { ResultsFrame } from '../components/ResultsFrame';
import type { EnterTracker } from '../components/EnterOnce';
import { SellerName } from '../components/SellerName';
import {
  AgeChip,
  CARD_PILL,
  CardFooter,
  CardHeader,
  CardShell,
  ItemPills,
  PersonPill,
  RealmChip,
  ResultRowFrame,
  RowFlags,
  VirtualCardList,
  VirtualRowList,
} from '../components/card-parts';
import { formatStat } from '../components/stat-text';
import type { WtbRequest } from '../lib/wtb';
import type { WantedFilters } from '../lib/types';
import { buildWtbCardModel, type WtbCardModel, type WtbCardStatus } from './wtb-card-model';
import { mineEntries, wtbTimesLine, type MineEntry } from './wtb-bump';
import type { StashWtbMatches, WtbSearch } from './useWtbData';
import type { WtbSelection } from './WtbRequestDrawer';
import { WtbItemArt } from './WtbItemArt';
import { WtbOwnerActionButtons, type WtbOwnerActions } from './WtbOwnerActions';
import { selectionContactItem } from './wtb-responses';
import { WantToBuyButton } from './WantToBuyButton';
import { useWtbWhisper } from './useWtbWhisper';

/** The selection a request opens in the drawer, with the user's stash item when it fits. */
export function wtbSelectionOf(request: WtbRequest, stash: StashWtbMatches): WtbSelection {
  const fit = stash.byRequest.get(request.id);
  return fit ? { request, niceToHave: fit.niceToHave, stashItem: fit.item } : { request };
}

/** The offer as a listing shows its price; a rune offer's HR value on hover. */
function OfferAmount({ model, className }: { model: WtbCardModel; className: string }) {
  const { t } = useTranslation('market');
  return (
    <Tip label={model.approxHr !== null ? t('wtb.card.approxHr', { hr: formatStat(model.approxHr) }) : undefined}>
      <span className={cn('max-w-full truncate tabular-nums', className)}>{model.offer}</span>
    </Tip>
  );
}

/** The line under the offer (where a listing has its note): "Pays · open to offers" / "Pays". */
const paysLine = (model: WtbCardModel) =>
  model.openToOffers
    ? `${translate('market:wtb.card.pays')} · ${translate('market:wtb.card.openToOffers')}`
    : translate('market:wtb.card.pays');

const STATUS_TONE: Record<WtbCardStatus, string> = {
  live: 'border-success/50 text-success',
  soon: 'border-warning/50 text-warning',
  paused: 'border-border text-muted-foreground',
  expired: 'border-destructive/40 text-destructive',
  closed: 'border-border text-muted-foreground',
};

/** Live · 3d left / Paused / Expired 2d ago / Closed. */
function StatusPill({
  status,
  daysLeft,
  expired,
}: {
  status: WtbCardStatus;
  daysLeft: number;
  expired: string | null;
}) {
  const { t } = useTranslation('market');
  const text =
    status === 'live' || status === 'soon'
      ? t('wtb.status.live', { count: daysLeft })
      : status === 'expired' && expired
        ? t('wtb.card.expiredAgo', { age: expired })
        : t(`wtb.status.${status}`);
  return <span className={cn(CARD_PILL, 'font-semibold', STATUS_TONE[status])}>{text}</span>;
}

/** A request's badges, where a listing shows Deal / Offer: You have one, Yours (with its status). */
function WtbBadges({ model, compact = false }: { model: WtbCardModel; compact?: boolean }) {
  const { t } = useTranslation('market');
  const size = compact ? 'h-4 px-1.5' : undefined;
  return (
    <>
      {model.fits && (
        <span className={cn(CARD_PILL, 'gap-0.5 border-success/50 bg-success/15 text-success', size)}>
          <Check className="size-2.5" />
          {t('wtb.youHaveOne')}
        </span>
      )}
      {model.own && !compact && (
        <span className="inline-flex items-center gap-1">
          <span className={cn(CARD_PILL, 'border-primary/50 text-primary')}>{t('wtb.yours')}</span>
          <StatusPill status={model.status}
            daysLeft={model.daysLeft}
            expired={model.times.expired} />
        </span>
      )}
      {model.own && compact && (
        <span className={cn(CARD_PILL, 'border-primary/50 text-primary', size)}>{t('wtb.yours')}</span>
      )}
    </>
  );
}

/** Copy whisper · Whisper · List at {offer} (when the user's stash item fits). */
function ContactActions({
  request,
  model,
  contactItem,
  onListAt,
}: {
  request: WtbRequest;
  model: WtbCardModel;
  contactItem: WtbContactItem | null;
  onListAt: () => void;
}) {
  const { t } = useTranslation('market');
  const { whisper, copyWhisper } = useWtbWhisper('market');
  const stop = (run: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    run();
  };
  return (
    <>
      <Tip label={t('wtb.copyWhisper')}>
        <Button
          variant="ghost"
          size="sm"
          className={iconActionClass}
          aria-label={t('wtb.copyWhisper')}
          onClick={stop(() => void copyWhisper(request, contactItem))}
        >
          <Copy className="size-3.5" />
        </Button>
      </Tip>
      {model.listPrice && (
        <Button variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={stop(onListAt)}>
          <Tag className="size-3.5" />
          {t('wtb.listAt', { offer: model.offer })}
        </Button>
      )}
      <Button size="sm"
        className="h-7 px-2.5 text-xs"
        onClick={stop(() => void whisper(request, contactItem))}>
        <MessageSquare className="size-3.5" />
        {t('wtb.whisperBuyer', { name: request.buyer.name })}
      </Button>
    </>
  );
}

/** Expired requests (Mine): dimmed until pointed at, so "Bump to revive" reads first. */
const EXPIRED_DIM = 'opacity-60 transition-opacity hover:opacity-100 focus-within:opacity-100';

const WtbCard = React.memo(function WtbCard({
  request,
  model,
  selected,
  onSelect,
  onListAt,
  contactItem,
  owner,
}: {
  request: WtbRequest;
  model: WtbCardModel;
  selected: boolean;
  onSelect: () => void;
  onListAt: () => void;
  /** The user's stash item that fits it (Fits my stash): sent with a contact. */
  contactItem: WtbContactItem | null;
  owner: WtbOwnerActions;
}) {
  const { t } = useTranslation('market');
  const { openPanel } = useOverlay();
  const counts = request.counts;
  return (
    <CardShell
      id={request.id}
      selected={selected}
      onSelect={onSelect}
      className={model.status === 'expired' ? EXPIRED_DIM : undefined}
    >
      <CardHeader
        art={
          <WtbItemArt
            filters={request.filters}
            className="size-full border-0 bg-none shadow-none"
            artClassName="max-h-[68px] max-w-14"
          />
        }
        title={model.title}
        titleClassName={model.titleColor}
        subtitle={model.kind ? t('wtb.card.subtitle', { kind: model.kind }) : t('wtb.card.subtitleAny')}
        pills={
          <ItemPills
            quality={model.pills.quality}
            qualityClassName={model.pills.qualityColor}
            sockets={model.pills.sockets}
            corrupted={model.pills.corrupted}
            ethereal={model.pills.ethereal}
          >
            {model.pills.flags.map((x) => (
              <span key={x.flag}
                className={cn(CARD_PILL, 'border-border/70 text-muted-foreground')}>
                {x.text}
              </span>
            ))}
          </ItemPills>
        }
        aside={
          // The listing card's price column: the amount, the note line, then its badges (where Deal / Offer go)
          <>
            <OfferAmount model={model}
              className="text-xl font-bold text-foreground" />
            <span className="max-w-full truncate text-[11px] text-muted-foreground">{paysLine(model)}</span>
            <WtbBadges model={model} />
          </>
        }
      />

      {model.wants.length > 0 && (
        <div className="space-y-px border-t border-border/50 px-1.5 py-1.5">
          <div className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {model.fits ? t('wtb.drawer.wantsYourItem') : t('wtb.drawer.wants')}
          </div>
          {model.wants.map((line) => (
            // A listing card's mod line (ModLine), the stash item's match marked as a listing marks a filter match
            <div
              key={line.id}
              className="relative flex min-h-6 items-center gap-2 overflow-hidden rounded-sm px-2 py-0.5 text-[13px]"
            >
              {line.matched && (
                <span aria-hidden
                  className="absolute inset-y-0.5 left-0 w-[3px] rounded-full bg-success" />
              )}
              <span
                className={cn(
                  'relative min-w-0 flex-1 truncate',
                  line.corruption ? 'text-q-corrupted' : 'text-q-magic',
                  line.matched && 'font-semibold',
                  line.nice && !line.matched && 'opacity-70',
                )}
              >
                {line.text}
              </span>
              {line.nice && (
                <span className={cn(CARD_PILL, 'h-4 border-border px-1.5 text-muted-foreground')}>{t('wtb.nice')}</span>
              )}
              {line.matched && (
                <span className="relative inline-flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums text-success">
                  <Check className="size-3" />
                  {line.value !== null && formatStat(line.value)}
                </span>
              )}
            </div>
          ))}
          {model.own && counts && (
            <div className="px-2 pt-0.5 text-[11px] text-muted-foreground">
              {counts.views === 0 && counts.contacts === 0 ? (
                t('wtb.mine.noMatches')
              ) : (
                <>
                  {t('wtb.mine.views', { count: counts.views })}
                  {' · '}
                  <span className={counts.contacts > 0 ? 'text-success' : undefined}>
                    {t('wtb.mine.contacts', { count: counts.contacts })}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <CardFooter
        info={
          <>
            <PersonPill>
              <SellerName
                className="font-semibold text-foreground"
                onOpen={() =>
                  openPanel(
                    'chat',
                    { userId: request.buyer.userId, userName: request.buyer.name, trader: true },
                    { focus: true },
                  )
                }
              >
                {request.buyer.name}
              </SellerName>
              <span className="truncate text-muted-foreground">*{request.whisperTo}</span>
            </PersonPill>
            <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              <AgeChip label={t('filters.sort.bumpedTitle')}>{wtbTimesLine(model.times)}</AgeChip>
              {(model.status === 'live' || model.status === 'soon' || model.status === 'paused') && (
                <span className={cn('tabular-nums', model.status === 'soon' && 'text-warning')}>
                  {t('wtb.daysLeft', { count: model.daysLeft })}
                </span>
              )}
              <RealmChip hardcore={request.filters.hardcore}
                ladder={request.filters.ladder} />
            </span>
          </>
        }
        actions={
          model.actions ? (
            <WtbOwnerActionButtons request={request}
              actions={model.actions}
              owner={owner}
              layout="card" />
          ) : (
            <ContactActions request={request}
              model={model}
              contactItem={contactItem}
              onListAt={onListAt} />
          )
        }
      />
    </CardShell>
  );
});

/** A request as a compact row: art, title and pills, what it wants, offer and buyer. */
const WtbRow = React.memo(function WtbRow({
  request,
  model,
  selected,
  onSelect,
  owner,
}: {
  request: WtbRequest;
  model: WtbCardModel;
  selected: boolean;
  onSelect: () => void;
  owner: WtbOwnerActions;
}) {
  const { openPanel } = useOverlay();
  const wants = model.wants.map((w) => w.text).join(' · ');
  return (
    <ResultRowFrame
      id={request.id}
      selected={selected}
      onSelect={onSelect}
      className={model.status === 'expired' ? EXPIRED_DIM : undefined}
      art={<WtbItemArt filters={request.filters}
        className="size-10"
        artClassName="max-h-9 max-w-9" />}
      title={
        <>
          <span className={cn('truncate text-[13px] font-semibold', model.titleColor)}>{model.title}</span>
          {model.kind && <span className="truncate text-[11px] text-muted-foreground">{model.kind}</span>}
          <RowFlags ethereal={model.pills.ethereal}
            sockets={model.pills.sockets}
            corrupted={model.pills.corrupted} />
          {model.pills.flags.map((x) => (
            <span key={x.flag}
              className="shrink-0 text-[10px] text-muted-foreground">
              {x.text}
            </span>
          ))}
          <WtbBadges model={model}
            compact />
          {model.actions && (
            <WtbOwnerActionButtons request={request}
              actions={model.actions}
              owner={owner}
              layout="row" />
          )}
        </>
      }
      summary={wants}
      aside={
        <>
          <OfferAmount model={model}
            className="text-xs font-semibold text-q-gold" />
          <span className="max-w-full truncate text-[10px] text-muted-foreground">{paysLine(model)}</span>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <SellerName
              className="max-w-16"
              onOpen={() =>
                openPanel(
                  'chat',
                  { userId: request.buyer.userId, userName: request.buyer.name, trader: true },
                  { focus: true },
                )
              }
            >
              {request.buyer.name}
            </SellerName>
            <span className="tabular-nums">{model.times.bumped ?? model.times.posted}</span>
          </div>
        </>
      }
    />
  );
});

const SKELETON_ROWS = 8;

export interface WantedResultsProps {
  search: WtbSearch;
  cards: boolean;
  /** The Rows | Cards switch, shared with the listings. */
  viewModeToggle: React.ReactNode;
  userId: string | null;
  stash: StashWtbMatches;
  wanted: WantedFilters;
  onSort: (sort: WtbSort) => void;
  /** "Want to buy" (the Live toolbar's button) and the empty view's call to action: the post pane. */
  onPost: () => void;
  /** The post pane is open (Want to buy accented). */
  postOpen: boolean;
  selectedId: string | null;
  /** Click: select and open the request drawer. */
  onOpen: (selection: WtbSelection) => void;
  onListAt: (selection: WtbSelection) => void;
  owner: WtbOwnerActions;
  enter: EnterTracker;
}

/**
 * The Wanted source's results: buy requests asking for what the filters describe, as cards (the listing card's
 * anatomy) or rows (Mine: Active and Expired sections), with the toolbar's count, order and "Want to buy".
 */
export function WantedResults({
  search,
  cards,
  viewModeToggle,
  userId,
  stash,
  wanted,
  onSort,
  onPost,
  selectedId,
  onOpen,
  onListAt,
  owner,
  enter,
  postOpen,
}: WantedResultsProps) {
  const { t } = useTranslation(['market', 'common']);
  const now = useNow();
  const models = useMemo(
    () =>
      new Map(
        search.items.map((request) => {
          const fit = stash.byRequest.get(request.id);
          return [request.id, buildWtbCardModel(request, { userId, fit, now })] as const;
        }),
      ),
    [search.items, stash.byRequest, userId, now],
  );
  const loading = search.status === 'loading';
  const shown = search.items;
  const fitting = stash.byRequest.size;
  const [expiredOpen, setExpiredOpen] = useState(true);

  const loadMore = {
    error: search.loadMoreError,
    retryAt: null,
    onRetry: search.loadMore,
  };

  let body: React.ReactNode;
  if (search.status === 'error' && shown.length === 0) {
    body = (
      <EmptyState
        className="m-6 border-destructive/30 bg-destructive/5"
        icon={<AlertTriangle />}
        title={t('wtb.loadFailed')}
        description={search.error ?? undefined}
        action={
          <Button size="sm"
            variant="outline"
            onClick={search.reload}>
            {t('common:actions.tryAgain')}
          </Button>
        }
      />
    );
  } else if ((loading || search.status === 'idle') && shown.length === 0) {
    body = (
      <div aria-busy
        className="space-y-1 p-2">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <Skeleton key={i}
            className="h-[52px] w-full" />
        ))}
      </div>
    );
  } else if (shown.length === 0) {
    body = (
      <EmptyState
        className="m-6"
        icon={<HandCoins />}
        title={
          wanted.mine
            ? t('wtb.empty.mineTitle')
            : wanted.fitsStash
              ? t('wtb.empty.stashTitle')
              : t('wtb.empty.allTitle')
        }
        description={
          wanted.mine
            ? t('wtb.empty.mineDescription')
            : wanted.fitsStash
              ? t('wtb.empty.stashDescription')
              : t('wtb.empty.allDescription')
        }
        action={
          <Button size="sm"
            onClick={onPost}>
            <HandCoins className="size-3.5" />
            {t('wtb.cta.post')}
          </Button>
        }
      />
    );
  } else {
    const select = (request: WtbRequest) => onOpen(wtbSelectionOf(request, stash));
    const listAt = (request: WtbRequest) => onListAt(wtbSelectionOf(request, stash));
    // Mine: Active then Expired (folded on demand, closed left out); else the results as they come
    const entries: MineEntry[] = wanted.mine
      ? mineEntries(shown, now, expiredOpen)
      : shown.map((request) => ({ kind: 'request', request }));
    const heading = (entry: Extract<MineEntry, { kind: 'section' }>) => (
      <MineSectionHeading entry={entry}
        onToggle={() => setExpiredOpen((open) => !open)} />
    );
    body = cards ? (
      <VirtualCardList
        items={entries}
        getKey={entryKey}
        selectedKey={selectedId}
        enter={enter}
        hasMore={search.hasMore}
        loadingMore={search.loadingMore}
        onLoadMore={search.loadMore}
        loadMore={loadMore}
        ariaLabel={t('wtb.listLabel')}
        renderCard={(entry) =>
          entry.kind === 'section' ? (
            heading(entry)
          ) : (
            <WtbCard
              request={entry.request}
              model={models.get(entry.request.id)!}
              selected={entry.request.id === selectedId}
              onSelect={() => select(entry.request)}
              onListAt={() => listAt(entry.request)}
              contactItem={selectionContactItem(wtbSelectionOf(entry.request, stash))}
              owner={owner}
            />
          )
        }
      />
    ) : (
      <VirtualRowList
        items={entries}
        getKey={entryKey}
        selectedKey={selectedId}
        rowHeight={ROW_HEIGHT}
        enter={enter}
        hasMore={search.hasMore}
        loadingMore={search.loadingMore}
        onLoadMore={search.loadMore}
        loadMore={loadMore}
        ariaLabel={t('wtb.listLabel')}
        renderRow={(entry) =>
          entry.kind === 'section' ? (
            heading(entry)
          ) : (
            <WtbRow
              request={entry.request}
              model={models.get(entry.request.id)!}
              selected={entry.request.id === selectedId}
              onSelect={() => select(entry.request)}
              owner={owner}
            />
          )
        }
      />
    );
  }

  return (
    <ResultsFrame
      refetching={loading && shown.length > 0}
      status={
        search.status === 'ready' || shown.length > 0 ? (
          <span className="truncate">
            {t('wtb.results.count', { count: search.total })}
            {fitting > 0 && (
              <span className="text-success">{` · ${t('wtb.results.fitting', { count: fitting })}`}</span>
            )}
          </span>
        ) : loading ? (
          t('results.searching')
        ) : null
      }
      toolbar={
        <>
          <Select value={wanted.sort ?? 'newest'}
            onValueChange={(v) => onSort(v as WtbSort)}>
            <SelectTrigger className="h-6 w-32 text-[11px]"
              aria-label={t('wtb.sort.label')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest"
                className="text-xs">
                {t('wtb.sort.newest')}
              </SelectItem>
              <SelectItem value="offer"
                className="text-xs">
                {t('wtb.sort.offer')}
              </SelectItem>
            </SelectContent>
          </Select>
          <WantToBuyButton open={postOpen}
            source="wanted"
            onToggle={onPost} />
          {viewModeToggle}
        </>
      }
    >
      {body}
    </ResultsFrame>
  );
}

const entryKey = (entry: MineEntry) => (entry.kind === 'section' ? `section:${entry.section}` : entry.request.id);

/** A Mine section heading: "Active (3)"; "Expired (2)" folds its requests. */
function MineSectionHeading({
  entry,
  onToggle,
}: {
  entry: Extract<MineEntry, { kind: 'section' }>;
  onToggle: () => void;
}) {
  const { t } = useTranslation('market');
  const label =
    entry.section === 'active'
      ? t('wtb.mineSections.active', { count: entry.count })
      : t('wtb.mineSections.expired', { count: entry.count });
  const className =
    'flex h-full w-full items-end gap-1 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground';
  return entry.section === 'active' ? (
    <div className={className}>{label}</div>
  ) : (
    <button
      type="button"
      aria-expanded={entry.open}
      onClick={onToggle}
      className={cn(className, 'hover:text-foreground')}
    >
      <ChevronDown className={cn('size-3 transition-transform', !entry.open && '-rotate-90')} />
      {label}
    </button>
  );
}
