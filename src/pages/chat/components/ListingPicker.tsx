import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, PackagePlus, RotateCw, Search } from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { buildGetAllUserMarketListingsQuery } from '@/pages/price-check/lib/tradeUrlBuilder';
import { ListingThumb, nameColor } from './ListingCard';
import { Tip } from './chat-parts';

/** Newest-bumped active listings offered by the picker. */
const PICKER_LIMIT = 50;

/** Chat link to a listing; `?display=` makes it read as the item name (see lib/market-links). */
export const listingMessageUrl = (listing: Pick<MarketListingEntry, '_id' | 'item'>) =>
  `https://www.projectdiablo2.com/market/listing/${listing._id}?display="${listing.item.name}"`;

type PickerState = { status: 'loading' } | { status: 'error' } | { status: 'done'; listings: MarketListingEntry[] };

/** "Link one of my listings": a searchable list of the signed-in user's active listings. */
export function ListingPicker({
  onPick,
  onClosed,
}: {
  onPick: (listing: MarketListingEntry) => void;
  /** The popover closed (picked or dismissed); focus goes back to the composer. */
  onClosed: () => void;
}) {
  const { t } = useTranslation(['chat', 'common']);
  const { authData, getMarketListings } = usePd2Website();
  const { settings } = useOptions();
  const userId = authData?.user?._id;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [state, setState] = useState<PickerState>({ status: 'loading' });
  const requestRef = useRef(0);

  const load = async () => {
    if (!userId) return;
    const request = ++requestRef.current;
    setState({ status: 'loading' });
    try {
      const result = await getMarketListings(
        buildGetAllUserMarketListingsQuery(
          userId,
          settings?.mode === 'hardcore',
          settings?.ladder === 'ladder',
          PICKER_LIMIT,
          0,
        ),
      );
      if (request === requestRef.current) setState({ status: 'done', listings: result?.data ?? [] });
    } catch (error) {
      console.error('Failed to load your listings:', error);
      if (request === requestRef.current) setState({ status: 'error' });
    }
  };

  const matches = useMemo(() => {
    if (state.status !== 'done') return [];
    const q = query.toLowerCase().trim();
    return q
      ? state.listings.filter((l) => [l.item.name, l.item.base?.name].some((s) => s?.toLowerCase().includes(q)))
      : state.listings;
  }, [state, query]);

  const pick = (listing: MarketListingEntry) => {
    onPick(listing);
    setOpen(false);
  };

  let body: React.ReactNode;
  if (state.status === 'loading') {
    body = (
      <div aria-busy
        className="space-y-1 p-1.5">
        <span className="sr-only">{t('picker.loading')}</span>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}
            className="flex items-center gap-2.5 px-1.5 py-1">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-10" />
          </div>
        ))}
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-xs text-muted-foreground">
        <AlertTriangle className="size-4 text-destructive" />
        {t('picker.loadFailed')}
        <Button variant="outline"
          size="sm"
          onClick={() => void load()}>
          <RotateCw className="size-3.5" />
          {t('common:actions.tryAgain')}
        </Button>
      </div>
    );
  } else if (matches.length === 0) {
    body = (
      <p className="px-3 py-6 text-center text-xs text-muted-foreground">
        {state.listings.length === 0 ? t('picker.noListings') : t('picker.noMatches')}
      </p>
    );
  } else {
    body = (
      <ul className="max-h-64 space-y-0.5 overflow-y-auto overscroll-contain p-1.5">
        {matches.map((listing) => (
          <li key={listing._id}>
            <button
              type="button"
              onClick={() => pick(listing)}
              className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left outline-none transition-colors duration-(--dur-fast) hover:bg-accent/70 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <ListingThumb listing={listing} />
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-semibold', nameColor(listing))}>
                  {listing.item.name}
                </span>
                {listing.item.base?.name && listing.item.base.name !== listing.item.name && (
                  <span className="block truncate text-[11px] text-muted-foreground">{listing.item.base.name}</span>
                )}
              </span>
              <span className="max-w-24 shrink-0 truncate text-xs font-medium tabular-nums text-foreground/85">
                {listing.hr_price > 0 ? `${listing.hr_price} HR` : listing.price || '—'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery('');
          void load();
        }
      }}
    >
      <Tip label={t('picker.linkListing')}>
        <PopoverTrigger
          aria-label={t('picker.linkListing')}
          disabled={!userId}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        >
          <PackagePlus className="size-4" />
        </PopoverTrigger>
      </Tip>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-80 p-0"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onClosed();
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('picker.title')}
          </span>
          {state.status === 'loading' && (
            <Loader2 aria-hidden
              className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="relative px-2 pt-2">
          <Search className="pointer-events-none absolute left-4.5 top-1/2 mt-1 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={t('picker.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && matches[0]) {
                e.preventDefault();
                pick(matches[0]);
              }
            }}
            className="h-8 pl-8 text-sm"
          />
        </div>
        {body}
      </PopoverContent>
    </Popover>
  );
}
