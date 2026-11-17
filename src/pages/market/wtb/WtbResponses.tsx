import React, { useState } from 'react';
import { CheckCheck, MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { confirmToast, showToast } from '@/overlay';
import { presenceLabel, shortAgo, traderPresence, useTraderProfile } from '@/pages/chat/hooks/useTraderProfile';
import { PRESENCE_TONE } from '@/pages/market/enrich/SellerCard';
import { useNow } from '@/pages/market/enrich/useNow';
import { t as translate, useTranslation } from '@/i18n';
import type { WtbRequest, WtbResponse } from '../lib/wtb';
import { WtbItemArt } from './WtbItemArt';
import { useWtbResponses } from './useWtbData';
import { useWtbWhisper } from './useWtbWhisper';
import { responseMetLine, sortResponses } from './wtb-responses';

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

/** "Mark filled", confirmed first (confirmMarkFilled). */
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
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-[11px]"
      disabled={disabled}
      onClick={() => confirmMarkFilled(response, onConfirm)}
    >
      <CheckCheck className="size-3" />
      {t('wtb.responses.markFilled')}
    </Button>
  );
}

function ResponseRow({
  response,
  onWhisperBack,
  onMarkFilled,
  onDismiss,
  busy,
}: {
  response: WtbResponse;
  onWhisperBack: () => void;
  onMarkFilled: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation('market');
  const now = useNow();
  const profile = useTraderProfile(response.seller.userId, now);
  const presence = traderPresence(profile.listings, now);
  const met = responseMetLine(response);
  return (
    <li className="space-y-1 rounded-md border border-border/60 p-2">
      <div className="flex min-w-0 items-start gap-2">
        <WtbResponseArt response={response}
          className="size-8" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className="truncate font-semibold">{response.seller.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {shortAgo(Date.parse(response.createdAt), now)}
            </span>
            <span aria-hidden
              className={cn('size-2 shrink-0 rounded-full', PRESENCE_TONE[presence.kind])} />
            <span className="truncate text-[11px] text-muted-foreground">{presenceLabel(presence, now)}</span>
          </div>
          <div className="truncate text-xs">{response.item?.name ?? t('wtb.responses.noItem')}</div>
          {met && <div className="text-[11px] text-success">{met}</div>}
        </div>
        <Tip label={t('wtb.responses.dismiss')}>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 shrink-0 p-0 text-muted-foreground"
            aria-label={t('wtb.responses.dismiss')}
            disabled={busy}
            onClick={onDismiss}
          >
            <X className="size-3.5" />
          </Button>
        </Tip>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1">
        <Button size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={onWhisperBack}>
          <MessageSquare className="size-3" />
          {t('wtb.response.whisperBack')}
        </Button>
        {response.request.status !== 'closed' && (
          <MarkFilledButton response={response}
            onConfirm={onMarkFilled}
            disabled={busy} />
        )}
      </div>
    </li>
  );
}

/**
 * The owner's "Responses · n" in their request's drawer: the sellers who answered it (newest, those with an item
 * first), with Whisper back, Mark filled (closes the request) and dismiss. Nothing while there are none.
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
