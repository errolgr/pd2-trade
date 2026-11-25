import React, { useState } from 'react';
import { Check, CheckCheck, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { confirmToast, showToast } from '@/overlay';
import { presenceLabel, shortAgo, traderPresence, useTraderProfile } from '@/pages/chat/hooks/useTraderProfile';
import { PRESENCE_TONE } from '@/pages/market/enrich/SellerCard';
import { useNow } from '@/pages/market/enrich/useNow';
import { t as translate, useTranslation } from '@/i18n';
import { formatOffer, isWtbOffer, type WtbOfferStatus, type WtbRequest, type WtbResponse } from '../lib/wtb';
import { WtbItemArt } from './WtbItemArt';
import { useWtbResponses } from './useWtbData';
import { useWtbOffers } from './useWtbOffers';
import { useWtbWhisper } from './useWtbWhisper';
import { acceptLabel, offerCardLine } from './wtb-offers';
import { responseMetLine, responseSummary, sortResponses } from './wtb-responses';

/** A response's item picture (its name, else its base). */
export function WtbResponseArt({ response, className }: { response: WtbResponse; className?: string }) {
  return response.item ? (
    <WtbItemArt
      filters={{ itemName: response.item.name, baseCode: response.item.baseCode ?? undefined }}
      className={className}
      artClassName="max-h-7 max-w-7"
    />
  ) : null;
}

/**
 * Asks "Close this request?" (the overlay's confirm toast) before `onConfirm` closes the request, recording the
 * response that filled it (markFilledPatch).
 */
export function confirmMarkFilled(response: WtbResponse, onConfirm: () => void | Promise<void>): void {
  confirmToast({
    title: translate('market:wtb.responses.confirmClose'),
    description: translate('market:wtb.responses.confirmCloseDescription', {
      title: response.request.title,
      seller: response.seller.name,
    }),
    confirmLabel: translate('market:wtb.responses.close'),
    variant: 'warning',
    duration: 10_000,
    onConfirm,
  });
}

/** "Mark filled" as an icon (the Responses row's actions), confirmed first (confirmMarkFilled). */
export function MarkFilledButton({
  response,
  onConfirm,
  disabled,
}: {
  response: WtbResponse;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const { t } = useTranslation('market');
  return (
    <Tip label={t('wtb.responses.markFilled')}>
      <Button
        variant="ghost"
        size="sm"
        className={ICON_BUTTON}
        aria-label={t('wtb.responses.markFilled')}
        disabled={disabled}
        onClick={() => confirmMarkFilled(response, onConfirm)}
      >
        <CheckCheck className="size-3.5" />
      </Button>
    </Tip>
  );
}

/** The row's icon-only actions (with their Tip). */
const ICON_BUTTON = 'size-6 shrink-0 p-0 text-muted-foreground hover:text-foreground';

/** A decided offer's status chip. */
const OFFER_STATUS_TONE: Record<Exclude<WtbOfferStatus, 'pending'>, string> = {
  accepted: 'border-success/50 bg-success/10 text-success',
  declined: 'border-border text-muted-foreground',
  withdrawn: 'border-border text-muted-foreground',
};

/**
 * One response in two lines, like a listing row: seller (presence dot) · age · what they have and the rows it meets
 * (cut short; all of it on hover) · an offer's price; then its note on the left and the actions on the right:
 * Accept {price} · Decline (a decided offer: its status instead) · Message back · Mark filled · dismiss.
 */
function ResponseRow({
  response,
  onWhisperBack,
  onAccept,
  onDecline,
  onMarkFilled,
  onDismiss,
  busy,
}: {
  response: WtbResponse;
  onWhisperBack: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onMarkFilled: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation('market');
  const now = useNow();
  const profile = useTraderProfile(response.seller.userId, now);
  const presence = traderPresence(profile.listings, now);
  const met = responseMetLine(response);
  const offer = isWtbOffer(response) ? response : null;
  const summary = responseSummary(response);
  const full = [offer ? offerCardLine(offer) : summary, met].filter(Boolean).join('\n');
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
      <WtbResponseArt response={response}
        className="size-8" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-1.5 text-xs">
          <Tip label={presenceLabel(presence, now)}>
            <span
              aria-label={presenceLabel(presence, now)}
              className={cn('size-2 shrink-0 rounded-full', PRESENCE_TONE[presence.kind])}
            />
          </Tip>
          <span className="max-w-28 shrink-0 truncate font-semibold">{response.seller.name}</span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {shortAgo(Date.parse(response.createdAt), now)}
          </span>
          <Tip label={<span className="whitespace-pre-line">{full}</span>}>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{summary}</span>
          </Tip>
          {offer && <span className="shrink-0 font-semibold tabular-nums text-q-gold">{formatOffer(offer.price)}</span>}
        </div>
        <div className="flex min-w-0 items-center gap-1">
          {/* The note takes all the width the actions leave before it's cut short */}
          <span className="flex min-w-0 flex-1 basis-0">
            {offer?.note && (
              <Tip label={offer.note}>
                <span className="min-w-0 truncate text-[11px] italic text-muted-foreground">“{offer.note}”</span>
              </Tip>
            )}
          </span>
          {offer?.status === 'pending' && (
            <>
              <Button
                size="sm"
                className="h-6 shrink-0 bg-success px-2 text-[11px] text-success-foreground hover:bg-success/90"
                disabled={busy}
                onClick={onAccept}
              >
                <Check className="size-3" />
                {acceptLabel(offer)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 shrink-0 px-2 text-[11px]"
                disabled={busy}
                onClick={onDecline}
              >
                {t('wtb.offers.decline')}
              </Button>
            </>
          )}
          {offer?.status && offer.status !== 'pending' && (
            <span
              className={cn(
                'inline-flex h-5 shrink-0 items-center rounded-full border px-2 text-[10px] font-medium',
                OFFER_STATUS_TONE[offer.status],
              )}
            >
              {t(`wtb.offers.status.${offer.status}`)}
            </span>
          )}
          <Tip label={t('wtb.response.whisperBack')}>
            <Button
              variant="ghost"
              size="sm"
              className={ICON_BUTTON}
              aria-label={t('wtb.response.whisperBack')}
              onClick={onWhisperBack}
            >
              <MessageSquare className="size-3.5" />
            </Button>
          </Tip>
          {response.request.status !== 'closed' && (
            <MarkFilledButton response={response}
              onConfirm={onMarkFilled}
              disabled={busy} />
          )}
          <Tip label={t('wtb.responses.dismiss')}>
            <Button
              variant="ghost"
              size="sm"
              className={ICON_BUTTON}
              aria-label={t('wtb.responses.dismiss')}
              disabled={busy}
              onClick={onDismiss}
            >
              <X className="size-3.5" />
            </Button>
          </Tip>
        </div>
      </div>
    </li>
  );
}

/**
 * The owner's "Responses · n" in their request's drawer: the sellers who answered it (pending offers first, then
 * newest with an item first): offers to sell with Accept / Decline, Message, Mark filled (closes the request) and
 * dismiss. Nothing while there are none.
 */
export function WtbRequestResponses({
  request,
  token,
  onMarkFilled,
}: {
  request: WtbRequest;
  token: string | null;
  /** Closes the request, recording the response that filled it (the page's owner action: Mine updates too). */
  onMarkFilled: (response: WtbResponse) => Promise<void> | void;
}) {
  const { t } = useTranslation('market');
  const responses = useWtbResponses(!!token, token, request.id);
  const { whisperBack } = useWtbWhisper('market');
  const { accept, decline } = useWtbOffers('market');
  const [busyId, setBusyId] = useState<string | null>(null);
  const list = sortResponses(responses.received);
  if (list.length === 0) return null;
  const run = async (id: string, action: () => Promise<void> | void) => {
    setBusyId(id);
    try {
      await action();
    } catch (error) {
      showToast({
        title: t('wtb.mine.updateFailed'),
        description: error instanceof Error ? error.message : String(error),
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };
  return (
    <section aria-label={t('wtb.responses.title', { count: list.length })}
      className="space-y-1">
      <h4 className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('wtb.responses.title', { count: list.length })}
      </h4>
      <ul className="space-y-1.5">
        {list.map((response) => (
          <ResponseRow
            key={response.id}
            response={response}
            busy={busyId === response.id}
            onWhisperBack={() => void whisperBack(response)}
            onAccept={() =>
              void run(response.id, async () => {
                const decided = await accept(response);
                if (decided) responses.upsert(decided);
              })
            }
            onDecline={() =>
              void run(response.id, async () => {
                const decided = await decline(response);
                if (decided) responses.upsert(decided);
              })
            }
            onMarkFilled={() =>
              void run(response.id, async () => {
                await onMarkFilled(response);
                responses.setRequestStatus(request.id, 'closed');
              })
            }
            onDismiss={() => void run(response.id, () => responses.dismiss(response.id))}
          />
        ))}
      </ul>
    </section>
  );
}
