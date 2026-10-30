import React, { useState } from 'react';
import moment from 'moment';
import { ArrowUp, Check, Clock, Loader2, Pencil, SquareArrowOutUpRight, Trash2, X as XIcon } from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ListingThumb, nameColor } from '@/pages/chat/components/ListingCard';
import { ItemTooltip } from '@/pages/market/components/ItemTooltip';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { itemDisplayName } from '@/pages/market/lib/listing';
import { bumpReadyAt } from './my-listings';

/** The listing's item art; hovering it (or anything wrapped in ItemHover) shows the in-game tooltip. */
export function ItemHover({ listing, children }: { listing: MarketListingEntry; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right"
        align="start"
        className="max-w-80 border-none bg-transparent p-0 shadow-none">
        <ItemTooltip item={listing.item}
          className="bg-popover shadow-panel" />
      </TooltipContent>
    </Tooltip>
  );
}

export function ListingArt({ listing, size }: { listing: MarketListingEntry; size: 'sm' | 'md' }) {
  return (
    <ItemHover listing={listing}>
      <span className="shrink-0 cursor-help">
        <ListingThumb
          listing={listing}
          className={size === 'md' ? 'size-11' : 'size-7'}
          artClassName={size === 'md' ? 'max-h-10 max-w-10' : 'max-h-6 max-w-6'}
        />
      </span>
    </ItemHover>
  );
}

/** Name in its quality colour, the in-game tooltip on hover. */
export function ListingName({ listing, className }: { listing: MarketListingEntry; className?: string }) {
  return (
    <ItemHover listing={listing}>
      <span className={cn('min-w-0 cursor-help truncate font-medium', nameColor(listing), className)}>
        {itemDisplayName(listing.item)}
      </span>
    </ItemHover>
  );
}

/** "Shako" under "Harlequin Crest": the base when the name doesn't already say it. */
export function baseName(listing: MarketListingEntry): string | null {
  const base = listing.item.base?.name;
  return base && !itemDisplayName(listing.item).includes(base) ? base : null;
}

/** The asking price: "2.5 HR", or the note itself for a note-only listing ("10 wss"). */
export function PriceText({ listing, className }: { listing: MarketListingEntry; className?: string }) {
  return listing.hr_price > 0 ? (
    <span className={cn('font-semibold tabular-nums text-foreground', className)}>{`${listing.hr_price} HR`}</span>
  ) : (
    <span className={cn('truncate font-semibold text-foreground', className)}>{listing.price || '—'}</span>
  );
}

/** The note beside an HR price ("or best offer"); a note-only listing's note is its price. */
export const sideNote = (listing: MarketListingEntry) => (listing.hr_price > 0 && listing.price ? listing.price : null);

const iconButton =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color] duration-(--dur-fast) hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5';

export interface ListingActionHandlers {
  onBump: (listing: MarketListingEntry) => void;
  onEdit: (listing: MarketListingEntry) => void;
  onDelete: (listing: MarketListingEntry) => void;
  onOpen: (listing: MarketListingEntry) => void;
}

/**
 * Edit, delete, open on the website, then Bump (a countdown while on cooldown) at the right edge. `compact`
 * (rows): the three icons float over the row's left side on hover, so they take no column of their own.
 */
export function ListingActions({
  listing,
  now,
  bumping,
  deleting,
  handlers,
  compact = false,
}: {
  listing: MarketListingEntry;
  now: number;
  bumping: boolean;
  deleting: boolean;
  handlers: ListingActionHandlers;
  compact?: boolean;
}) {
  const { t } = useTranslation(['quickList', 'common']);
  const readyAt = bumpReadyAt(listing);
  const ready = readyAt <= now;
  return (
    <div className="relative flex shrink-0 items-center gap-0.5">
      <span
        className={cn(
          'flex items-center gap-0.5',
          compact &&
            'pointer-events-none absolute right-full mr-1 rounded-md bg-card px-0.5 opacity-0 shadow-sm transition-opacity duration-(--dur-fast) group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100',
        )}
      >
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={iconButton}
              aria-label={t('listing.editPrice')}
              onClick={() => handlers.onEdit(listing)}
            >
              <Pencil />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('listing.editPrice')}</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(iconButton, 'text-destructive/80 hover:bg-destructive/15 hover:text-destructive')}
              aria-label={deleting ? t('listing.deleting') : t('listing.removeListing')}
              disabled={deleting}
              onClick={() => handlers.onDelete(listing)}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('listing.removeListing')}</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={iconButton}
              aria-label={t('listing.goToTrade')}
              onClick={() => handlers.onOpen(listing)}
            >
              <SquareArrowOutUpRight />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('listing.goToTrade')}</TooltipContent>
        </Tooltip>
      </span>
      {ready ? (
        <Button
          size="sm"
          className={cn('w-[72px] gap-1 text-xs', compact ? 'h-6 px-2' : 'h-7 px-2.5')}
          onClick={() => handlers.onBump(listing)}
          disabled={bumping}
          aria-label={t('listing.bumpToTop')}
        >
          {bumping ? <Loader2 className="size-3 animate-spin" /> : <ArrowUp className="size-3.5" />}
          {t('listing.bump')}
        </Button>
      ) : (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              className={cn(
                'inline-flex w-[72px] items-center justify-center gap-1 rounded-md border border-border/70 text-xs tabular-nums text-muted-foreground',
                compact ? 'h-6 px-1.5' : 'h-7 px-2',
              )}
            >
              <Clock className="size-3 shrink-0" />
              <span className="truncate">{shortWait(readyAt - now)}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('listing.canBumpIn', { time: moment(readyAt).fromNow() })}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/** "3h", "45m": the cooldown left, short enough for the bump column. */
export function shortWait(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return minutes >= 60 ? `${Math.ceil(minutes / 60)}h` : `${minutes}m`;
}

/** Inline note + HR price editor; Enter saves, Escape cancels. */
export function ListingEditor({
  listing,
  onSave,
  onCancel,
}: {
  listing: MarketListingEntry;
  onSave: (price: string, note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation(['quickList', 'common']);
  const [note, setNote] = useState(listing.price ?? '');
  const [price, setPrice] = useState(listing.hr_price > 0 ? String(listing.hr_price) : '');
  const [saving, setSaving] = useState(false);
  const valid = note.trim().length > 0 || Number(price) > 0;
  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave(price, note);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <Input
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('form.notePlaceholder')}
        aria-label={t('form.note')}
        className="h-7 min-w-0 flex-1 text-xs"
        autoComplete="off"
      />
      <Input
        type="number"
        min={0}
        step={0.01}
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder={t('form.hr')}
        aria-label={t('form.hrPrice')}
        className="h-7 w-20 text-xs tabular-nums"
      />
      <Button
        type="submit"
        size="sm"
        className="h-7 px-2"
        disabled={!valid || saving}
        aria-label={t('common:actions.save')}
      >
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2"
        onClick={onCancel}
        aria-label={t('common:actions.cancel')}
      >
        <XIcon className="size-3.5" />
      </Button>
    </form>
  );
}
