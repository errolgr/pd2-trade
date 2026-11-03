import React, { useState } from 'react';
import { ChevronDown, Copy, HandCoins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { showToast } from '@/overlay';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ListingActions } from '../hooks/useListingActions';
import type { MarketApi } from '../lib/types';
import { NumberInput, fieldInputClass } from './controls';
import { useTranslation } from '@/i18n';

/** Icon-only action button (tooltip via title). */
export const iconActionClass = 'size-7 p-0 text-muted-foreground hover:text-foreground';

/**
 * Make offer: the site's offer form (offer text + optional HR value) in a popover; the website without
 * createOffer. `ensureFresh` re-checks the listing on PD2 before sending (useListingActions). `dense`: card
 * footer size. `openNonce`: a changed value opens the form (the card's O hotkey).
 */
export function OfferButton({
  api,
  listing,
  onWebsite,
  ensureFresh,
  dense = false,
  openNonce,
}: {
  api: MarketApi | null;
  listing: MarketListingEntry;
  onWebsite: () => void;
  ensureFresh: ListingActions['ensureFresh'];
  dense?: boolean;
  openNonce?: number;
}) {
  const { t } = useTranslation('market');
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [hr, setHr] = useState<number | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const createOffer = api?.createOffer;
  const label = createOffer ? t('offer.make') : t('offer.onSite');
  // Adjusted during render: a new hotkey press opens the form (or the website without createOffer)
  const [seenNonce, setSeenNonce] = useState(openNonce);
  if (openNonce !== seenNonce) {
    setSeenNonce(openNonce);
    if (openNonce !== undefined && createOffer) setOpen(true);
  }
  const button = (
    <Button
      size="sm"
      className={dense ? 'h-7 px-2.5 text-xs' : 'h-8 text-xs'}
      onClick={createOffer ? undefined : onWebsite}
    >
      <HandCoins className="size-3.5" />
      {label}
    </Button>
  );
  if (!createOffer) return button;

  const submit = async () => {
    if (!price.trim() || sending) return;
    setSending(true);
    try {
      // Gone or repriced since it was shown: the toast says so; a repeat send after a change goes ahead
      if (!(await ensureFresh())) return;
      const created = await createOffer(listing._id, { price: price.trim(), hrPrice: hr && hr > 0 ? hr : undefined });
      if (created === null) return; // 401: the sign-in flow takes over
      showToast({
        title: t('offer.sent'),
        description: t('offer.sentDescription', { price: price.trim(), item: listing.item.name }),
        variant: 'success',
      });
      setOpen(false);
      setPrice('');
      setHr(undefined);
    } catch (e) {
      // 403: a sign-in from before 0.10.2 lacks the offer:create scope; only a fresh sign-in grants it
      const forbidden = e instanceof Error && 'statusCode' in e && e.statusCode === 403;
      showToast({
        title: t('offer.notSent'),
        description: forbidden
          ? t('offer.forbidden')
          : e instanceof Error
            ? e.message.split('\n')[0]
            : t('offer.refused'),
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent side="top"
        align="start"
        className="w-72 p-2.5">
        <form
          className="space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="text-xs font-semibold">{t('offer.formTitle', { item: listing.item.name })}</div>
          {listing.price && (
            <div className="truncate text-[11px] text-muted-foreground">
              {t('offer.asking', { price: listing.price })}
            </div>
          )}
          <Input
            autoFocus
            aria-label={t('offer.offerLabel')}
            placeholder={t('offer.placeholder')}
            maxLength={120}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={fieldInputClass}
          />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="shrink-0">{t('offer.worth')}</span>
            <NumberInput
              ariaLabel={t('offer.valueLabel')}
              value={hr}
              step={0.1}
              min={0}
              onChange={setHr}
              placeholder={t('offer.valuePlaceholder')}
            />
          </label>
          <Button type="submit"
            size="sm"
            className="h-7 w-full text-xs"
            disabled={!price.trim() || sending}>
            {sending ? t('offer.sending') : t('offer.send')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Whisper (copy) with a menu of the user's chat templates; `dense`: the card footer's outline style. */
export function WhisperButton({ actions, dense = false }: { actions: ListingActions; dense?: boolean }) {
  const { t } = useTranslation('market');
  const { copyWhisper, whisperTemplates } = actions;
  const variant = dense ? 'outline' : 'secondary';
  return (
    <div className="flex min-w-0">
      <Button
        variant={variant}
        size="sm"
        className={cn('flex-1 rounded-r-none text-xs', dense ? 'h-7 px-2.5' : 'h-8')}
        title={t('whisper.copyTitle')}
        onClick={() => void copyWhisper()}
      >
        <Copy className="size-3.5" />
        {t('whisper.button')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className={cn('rounded-l-none border-l-0 p-0', dense ? 'h-7 w-5' : 'h-8 w-6 border-l border-border/60')}
            aria-label={t('whisper.withTemplate')}
            title={t('whisper.withTemplate')}
          >
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"
          className="w-60">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('whisper.withChatTemplate')}
          </DropdownMenuLabel>
          {whisperTemplates.length === 0 && (
            <DropdownMenuItem disabled
              className="text-xs">
              {t('whisper.noTemplates')}
            </DropdownMenuItem>
          )}
          {whisperTemplates.map((tpl) => (
            <DropdownMenuItem key={tpl.id}
              className="text-xs"
              onSelect={() => void copyWhisper(tpl.text)}>
              <span className="min-w-0 flex-1 truncate">{tpl.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
