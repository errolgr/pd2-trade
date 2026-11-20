import React, { useState } from 'react';
import { Check, ChevronDown, Copy, HandCoins, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tip } from '@/components/ui/tooltip';
import { useOptions } from '@/hooks/useOptions';
import { useOverlay } from '@/overlay';
import { useTranslation } from '@/i18n';
import type { WtbContactItem } from '../alerts/wtb-api';
import { iconActionClass } from '../components/ListingActions';
import { NumberInput, SelectMenu } from '../components/controls';
import { formatOffer, isValidOfferAmount, WTB_CURRENCY_OPTIONS, type WtbCurrency, type WtbRequest } from '../lib/wtb';
import { useMyWtbOffer } from './my-offers';
import { useWtbOffers } from './useWtbOffers';
import { useWtbWhisper } from './useWtbWhisper';
import { offerPriceRule, sellState } from './wtb-offers';

/** The longest note an offer takes (the server cuts it). */
export const MAX_OFFER_NOTE = 140;

/** Button sizes per surface: the Wanted card's footer, the request drawer's footer, the buyers chip's rows. */
const SIZE = {
  card: { button: 'h-7 px-2.5 text-xs', icon: 'size-3.5', segment: 'h-7 w-5' },
  drawer: { button: 'h-8 text-xs', icon: 'size-3.5', segment: 'h-8 w-6' },
  chip: { button: 'h-6 px-2 text-[11px]', icon: 'size-3', segment: 'h-6 w-5' },
} as const;

/**
 * The ▾ of "Sell for {offer}" (open to offers): another price — amount + currency (the post form's picker) + an
 * optional note, then Send — in a popover anchored to it.
 */
function AskPricePopover({
  request,
  onSend,
  disabled,
  segmentClassName,
}: {
  request: WtbRequest;
  onSend: (ask: { price: { amount: number; currency: WtbCurrency }; note?: string }) => Promise<boolean>;
  disabled: boolean;
  segmentClassName: string;
}) {
  const { t } = useTranslation('market');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | undefined>(request.offer.amount);
  const [currency, setCurrency] = useState<WtbCurrency>(request.offer.currency);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  // Valid, and a price the buyer takes (theirs, or any when open to offers)
  const valid = isValidOfferAmount(amount) && offerPriceRule(request, { amount, currency }) !== 'fixedPrice';
  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    const sent = await onSend({ price: { amount, currency }, note });
    setSending(false);
    if (sent) setOpen(false);
  };
  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <Tip label={t('wtb.offers.askDifferent')}>
        <PopoverTrigger asChild>
          <Button size="sm"
            className={segmentClassName}
            disabled={disabled}
            aria-label={t('wtb.offers.askDifferent')}>
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end"
        className="w-72 space-y-2 p-3 text-xs">
        <div className="font-medium">{t('wtb.offers.askTitle', { offer: formatOffer(request.offer) })}</div>
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <NumberInput
              ariaLabel={t('wtb.post.amount')}
              placeholder={t('wtb.post.amount')}
              value={amount}
              min={0}
              step={0.5}
              onChange={setAmount}
            />
          </div>
          <SelectMenu
            label={t('wtb.post.currency')}
            value={currency}
            options={WTB_CURRENCY_OPTIONS}
            anyLabel={null}
            onChange={(v) => v && setCurrency(v as WtbCurrency)}
            className="w-24 shrink-0"
          />
        </div>
        {amount !== undefined && !valid && (
          <p className="text-[11px] text-destructive">{t('wtb.post.invalidAmount')}</p>
        )}
        <Input
          aria-label={t('wtb.offers.note')}
          placeholder={t('wtb.offers.notePlaceholder')}
          value={note}
          maxLength={MAX_OFFER_NOTE}
          onChange={(e) => setNote(e.target.value)}
          className="h-8 text-xs"
        />
        <Button size="sm"
          className="h-8 w-full text-xs"
          disabled={!valid || sending}
          onClick={() => void send()}>
          <HandCoins className="size-3.5" />
          {t('wtb.offers.send')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A seller's actions on a request they could fill: copy whisper · Message (outline) · Sell for {offer} (primary, the
 * listing's "Make offer" style), then "Ask a different price" when the buyer is open to offers. Once sent, the
 * primary turns into the offer's state: "Offer sent · pending" (Withdraw), "Accepted · message {buyer}" (opens the
 * chat), or "Declined" with Sell again. `item`: the matching item (price-checked / stash / listing), when there is one.
 */
export function WtbSellActions({
  request,
  item,
  layout,
  source,
  className,
}: {
  request: WtbRequest;
  item: WtbContactItem | null;
  layout: 'card' | 'drawer' | 'chip';
  source: 'priceCheck' | 'listItem' | 'market';
  className?: string;
}) {
  const { t } = useTranslation('market');
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const token = settings?.pd2Token || null;
  const { whisper, copyWhisper } = useWtbWhisper(source);
  const { sell, withdraw } = useWtbOffers(source);
  const offer = useMyWtbOffer(request.id, token);
  const state = sellState(offer);
  const [busy, setBusy] = useState(false);
  const size = SIZE[layout];
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };
  const offerText = formatOffer(request.offer);
  // The buyer takes another price only when open to offers (the rule the server applies too)
  const canAsk = request.openToOffers;

  // "Sell for {offer}" at their price; open to offers, a ▾ segment asks another (the listing's "Whisper ▾" split)
  const sellButton = (
    <div className="flex min-w-0">
      <Button
        size="sm"
        className={cn(size.button, canAsk && 'rounded-r-none')}
        disabled={busy}
        onClick={() => void run(() => sell(request, item))}
      >
        <HandCoins className={size.icon} />
        {t('wtb.offers.sell', { offer: offerText })}
      </Button>
      {canAsk && (
        <AskPricePopover
          request={request}
          disabled={busy}
          segmentClassName={cn('rounded-l-none border-l border-primary-foreground/25 p-0', size.segment)}
          onSend={(ask) => sell(request, item, ask)}
        />
      )}
    </div>
  );
  const primary =
    state.kind === 'pending' ? (
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-disabled
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-info/40 bg-info/10 font-medium text-info',
            size.button,
          )}
        >
          {t('wtb.offers.pending')}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => withdraw(state.offer))}
          className="rounded-sm text-[11px] text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {t('wtb.offers.withdraw')}
        </button>
      </span>
    ) : state.kind === 'accepted' ? (
      <Button
        size="sm"
        variant="outline"
        className={cn('border-success/50 text-success hover:text-success', size.button)}
        onClick={() =>
          openPanel(
            'chat',
            { userId: request.buyer.userId, userName: request.buyer.name, reply: true },
            { focus: true },
          )
        }
      >
        <Check className={size.icon} />
        {t('wtb.offers.accepted', { buyer: request.buyer.name })}
      </Button>
    ) : state.kind === 'declined' ? (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">{t('wtb.offers.declined')}</span>
        {sellButton}
      </span>
    ) : (
      sellButton
    );

  return (
    // One row, like a listing card's actions; the card / chip row around it selects or opens on click: they don't
    <span
      className={cn('inline-flex items-center justify-end gap-1', layout === 'drawer' && 'flex w-full', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Tip label={t('wtb.copyWhisper')}>
        <Button
          variant="ghost"
          size="sm"
          className={layout === 'chip' ? 'size-6 p-0' : iconActionClass}
          aria-label={t('wtb.copyWhisper')}
          onClick={() => void copyWhisper(request, item)}
        >
          <Copy className={size.icon} />
        </Button>
      </Tip>
      <Button
        variant="outline"
        size="sm"
        className={cn(size.button, layout === 'drawer' && 'flex-1')}
        aria-label={t('wtb.whisperBuyer', { name: request.buyer.name })}
        onClick={() => void whisper(request, item)}
      >
        <MessageSquare className={size.icon} />
        {t('wtb.message')}
      </Button>
      <span className={cn('inline-flex', layout === 'drawer' && 'flex-1 justify-end')}>{primary}</span>
    </span>
  );
}
