import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ListChecks, ListPlus, Loader2, PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import {
  AccountMismatchError,
  AuthenticationError,
  NoAccountSelectedError,
  Pd2WebsiteContext,
} from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { isNetworkError } from '@/lib/network-errors';
import { cn } from '@/lib/utils';
import type { ValuationLine } from '@/lib/networth-api';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { CustomToastPayload, GenericToastPayload, ToastActionType } from '@/common/types/Events';
import {
  buildGetAllUserMarketListingsQuery,
  buildGetMarketListingByStashItemQuery,
} from '@/pages/price-check/lib/tradeUrlBuilder';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import ItemStatsDisplay from '@/pages/quick-list/components/ItemStatsDisplay';
import { itemCard } from '@/pages/quick-list/components/styles';
import { showToast, useOverlay } from '@/overlay';
import { useTranslation } from '@/i18n';

type Pd2Website = NonNullable<React.ContextType<typeof Pd2WebsiteContext>>;

/** PD2's cap on a user's active listings (ListItemShortcut enforces the same). */
const MAX_LISTINGS = 50;
/** buildGetMarketListingByStashItemQuery checks at most this many hashes. */
const MAX_ITEMS = 20;

/** A line backed by real stash items with a Net Worth unit price can be listed at that price. */
export function isListable(line: ValuationLine): boolean {
  return (line.itemHashes?.length ?? 0) > 0 && (line.unitPrice ?? 0) > 0;
}

/**
 * Right-click menu on a holding row: "List on market…" opens a confirm popover, anchored at the row, that lists one
 * of the line's stash items on the PD2 market at its Net Worth unit price. Lines that can't be listed, or while
 * signed out of PD2, render the row as it is (no custom menu).
 */
export function ListAtNetWorthMenu({ line, children }: { line: ValuationLine; children: React.ReactElement }) {
  const { t } = useTranslation('currency');
  const pd2 = useContext(Pd2WebsiteContext);
  const [formOpen, setFormOpen] = useState(false);
  // Set by "List on market…": the form opens once the menu has closed, so the menu's focus handoff can't dismiss it
  const openFormOnMenuClose = useRef(false);
  // The line's items known to be listed: checked when the form opens, plus what it listed
  const [listed, setListed] = useState<ReadonlySet<string>>(() => new Set());

  if (!isListable(line) || !pd2?.authData?.user) return children;
  const allListed = line.itemHashes!.every((hash) => listed.has(hash));

  return (
    <Popover open={formOpen}
      onOpenChange={setFormOpen}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <PopoverAnchor asChild>{children}</PopoverAnchor>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-52"
          onCloseAutoFocus={(e) => {
            if (!openFormOnMenuClose.current) return;
            openFormOnMenuClose.current = false;
            // The form popover takes focus instead of the row
            e.preventDefault();
            setFormOpen(true);
          }}
        >
          {allListed ? (
            <>
              <ContextMenuItem disabled>
                <Check className="text-success" />
                {t('listAtNetWorth.alreadyListed')}
              </ContextMenuItem>
              <ManageListingsItem />
            </>
          ) : (
            <ContextMenuItem onSelect={() => (openFormOnMenuClose.current = true)}>
              <ListPlus />
              {t('listAtNetWorth.menuItem')}
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <PopoverContent align="end"
        className="w-80 p-3">
        {formOpen && <ListAtNetWorthForm line={line}
          pd2={pd2}
          listed={listed}
          setListed={setListed} />}
      </PopoverContent>
    </Popover>
  );
}

/** Own component: useOverlay needs the overlay provider, which only the opened menu may require. */
function ManageListingsItem() {
  const { t } = useTranslation('currency');
  const { openPanel } = useOverlay();
  return (
    <ContextMenuItem onSelect={() => openPanel('quickList', undefined, { placement: 'gameCenter' })}>
      <ListChecks />
      {t('listAtNetWorth.manageListings')}
    </ContextMenuItem>
  );
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'gone' }
  | { kind: 'failed'; message: string }
  | { kind: 'ready'; items: GameStashItem[] };

/** Expected user-state conditions (signed out, wrong account, PD2 unreachable) aren't app bugs: no error report. */
function logFailure(context: string, err: unknown) {
  if (isNetworkError(err)) console.warn(`[NetWorth] ${context}:`, err);
  else if (
    !(err instanceof AuthenticationError) &&
    !(err instanceof AccountMismatchError) &&
    !(err instanceof NoAccountSelectedError)
  ) {
    console.error(`[NetWorth] ${context}:`, err);
  }
}

/** handleApiResponse resolves null on a 401 (re-authentication already started): nothing was read or listed. */
function orSessionExpired<T>(value: T | null | undefined): T {
  if (value == null) throw new AuthenticationError('PD2 session expired');
  return value;
}

function ListAtNetWorthForm({
  line,
  pd2,
  listed,
  setListed,
}: {
  line: ValuationLine;
  pd2: Pd2Website;
  listed: ReadonlySet<string>;
  setListed: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
}) {
  const { t } = useTranslation(['currency', 'quickList']);
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const { fetchStash, getMarketListings, listSpecificItem, authData } = pd2;
  const userId = authData.user._id;
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [price, setPrice] = useState(() => (line.unitPrice ?? 0).toFixed(2));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allListingsQuery = useMemo(
    () =>
      buildGetAllUserMarketListingsQuery(userId, settings?.mode === 'hardcore', settings?.ladder === 'ladder', 1, 0),
    [userId, settings?.mode, settings?.ladder],
  );

  // On open: the line's items in a fresh stash read (the Net Worth snapshot can be minutes old), and which are listed
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stash = orSessionExpired(await fetchStash());
        const byHash = new Map((stash.items ?? []).map((item) => [item.hash, item]));
        const items = (line.itemHashes ?? [])
          .map((hash) => byHash.get(hash))
          .filter((item): item is GameStashItem => !!item)
          .slice(0, MAX_ITEMS);
        if (cancelled) return;
        if (items.length === 0) {
          setPhase({ kind: 'gone' });
          return;
        }
        const query = buildGetMarketListingByStashItemQuery(items, userId);
        const listings = query ? orSessionExpired(await getMarketListings({ ...query, $limit: items.length })) : null;
        if (cancelled) return;
        const nowListed = new Set((listings?.data ?? []).map((listing) => listing.item.hash));
        setListed(nowListed);
        setSelected(items.find((item) => !nowListed.has(item.hash))?.hash ?? null);
        setPhase({ kind: 'ready', items });
      } catch (err) {
        if (cancelled) return;
        logFailure('Failed to load the item to list', err);
        setPhase({
          kind: 'failed',
          message:
            err instanceof AuthenticationError
              ? t('listAtNetWorth.sessionExpired')
              : err instanceof Error
                ? err.message
                : t('listAtNetWorth.loadFailed'),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Once per open: the popover content mounts on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase.kind === 'loading') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t('listAtNetWorth.loading')}
      </p>
    );
  }
  if (phase.kind === 'gone') {
    return (
      <p role="alert"
        className="flex items-start gap-2 text-sm">
        <PackageX className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        {t('listAtNetWorth.gone')}
      </p>
    );
  }
  if (phase.kind === 'failed') {
    return (
      <p role="alert"
        className="text-sm text-destructive">
        {phase.message}
      </p>
    );
  }

  const { items } = phase;
  const selectedItem = items.find((item) => item.hash === selected && !listed.has(item.hash)) ?? null;
  const trimmedPrice = price.trim();
  const numericPrice = Number(trimmedPrice);
  const hasPrice = trimmedPrice !== '' && Number.isFinite(numericPrice) && numericPrice > 0;
  const canSubmit = !!selectedItem && (hasPrice || note.trim().length > 0) && !submitting;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedItem || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { total } = orSessionExpired(await getMarketListings(allListingsQuery));
      if (total >= MAX_LISTINGS) {
        const capToast: GenericToastPayload = {
          title: t('quickList:shortcut.maxListingsTitle'),
          description: t('quickList:shortcut.maxListingsDescription'),
          variant: 'error',
        };
        showToast(capToast);
        return;
      }
      const listing = orSessionExpired(
        await listSpecificItem(selectedItem, hasPrice ? numericPrice : 0, note, hasPrice ? 'exact' : 'note'),
      );
      const listedToast: CustomToastPayload = {
        title: t('quickList:shortcut.itemListedTitle'),
        description: t('quickList:shortcut.addedDescription'),
        action: {
          label: selectedItem.name || t('quickList:shortcut.goToListing'),
          type: ToastActionType.OPEN_MARKET_LISTING,
          data: { listingId: listing._id },
        },
      };
      showToast(listedToast);
      const nowListed = new Set(listed).add(selectedItem.hash);
      setListed(nowListed);
      setSelected(items.find((item) => !nowListed.has(item.hash))?.hash ?? null);
      setNote('');
    } catch (err) {
      logFailure('Failed to list the item', err);
      setError(
        err instanceof AuthenticationError
          ? t('listAtNetWorth.sessionExpired')
          : err instanceof Error
            ? err.message
            : t('listAtNetWorth.listFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const allListed = items.every((item) => listed.has(item.hash));

  return (
    <form className="space-y-3"
      onSubmit={submit}>
      <p className="text-sm font-semibold">{t('listAtNetWorth.title')}</p>
      <div
        role="radiogroup"
        aria-label={t('listAtNetWorth.pickItem')}
        className="-mx-1 max-h-56 space-y-1.5 overflow-y-auto px-1 py-px"
      >
        {items.map((item) => {
          const isListed = listed.has(item.hash);
          const isSelected = item.hash === selectedItem?.hash;
          return (
            <div
              key={item.hash}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isListed}
              tabIndex={isListed ? -1 : 0}
              className={cn(
                itemCard({ tone: isListed ? 'static' : isSelected ? 'selected' : 'interactive' }),
                'p-2',
                isListed && 'opacity-70',
              )}
              onClick={() => !isListed && setSelected(item.hash)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget || isListed) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(item.hash);
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn('truncate text-sm', qualityColor(item.quality?.name ?? ''))}
                  style={{ fontFamily: 'DiabloFont' }}
                >
                  {item.name}
                </span>
                {isListed && (
                  <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-success/35 bg-success/12 px-2 text-[11px] font-semibold text-success">
                    <Check className="size-3" />
                    {t('listAtNetWorth.listed')}
                  </span>
                )}
              </div>
              {Array.isArray(item.modifiers) && (
                <ItemStatsDisplay
                  stashItem={item}
                  isExpanded={expanded.has(item.hash)}
                  onToggleExpanded={(hash) =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (!next.delete(hash)) next.add(hash);
                      return next;
                    })
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      {allListed ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('listAtNetWorth.allListed')}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => openPanel('quickList', undefined, { placement: 'gameCenter' })}
          >
            {t('listAtNetWorth.manageListings')}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <div className="space-y-1">
              <Label htmlFor={`nw-list-price-${line.key}`}
                className="text-xs">
                {t('listAtNetWorth.price')}
              </Label>
              <Input
                id={`nw-list-price-${line.key}`}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-8 tabular-nums"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`nw-list-note-${line.key}`}
                className="text-xs">
                {t('listAtNetWorth.note')}
              </Label>
              <Input
                id={`nw-list-note-${line.key}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-8"
              />
            </div>
          </div>
          {error && (
            <p role="alert"
              className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit"
            size="sm"
            className="w-full"
            disabled={!canSubmit}>
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <ListPlus className="size-3.5" />}
            {t('listAtNetWorth.list')}
          </Button>
        </>
      )}
    </form>
  );
}
