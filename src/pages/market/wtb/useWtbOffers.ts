import { useCallback } from 'react';
import { showToast, useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { trackEvent } from '@/lib/telemetry';
import { t } from '@/i18n';
import { decideWtbOffer, offerWtbRequest, wtbOfferBody, type WtbContactItem } from '../alerts/wtb-api';
import { formatOffer, isWtbOffer, type WtbCurrency, type WtbRequest, type WtbResponse } from '../lib/wtb';
import { upsertMyOffer } from './my-offers';
import { dealDraft, offerFailure, type OfferFailure } from './wtb-offers';

/** A different price (and note) asked with "Ask a different price". */
export interface WtbAsk {
  price: { amount: number; currency: WtbCurrency };
  note?: string;
}

const FAILURE_KEYS: Record<OfferFailure, string> = {
  fixedPrice: 'market:wtb.offers.fixedPrice',
  notOpen: 'market:wtb.offers.notOpen',
  throttled: 'market:wtb.offers.throttled',
  failed: 'market:wtb.offers.failed',
};

function toastFailure(error: unknown, title: string): void {
  showToast({
    title: t(FAILURE_KEYS[offerFailure(error)]),
    description: error instanceof Error ? error.message : title,
    variant: 'error',
  });
}

/** Signed out: says so; nothing was sent. */
function askSignIn(): null {
  showToast({ title: t('market:wtb.offers.signIn'), variant: 'warning' });
  return null;
}

export interface WtbOfferActions {
  /** Sends (or replaces) the user's offer: the item when the source has one, the request's price or `ask`. */
  sell: (request: WtbRequest, item: WtbContactItem | null | undefined, ask?: WtbAsk) => Promise<boolean>;
  /** The seller takes back their pending offer. */
  withdraw: (offer: WtbResponse) => Promise<void>;
  /** The buyer accepts: the seller is told (server), the chat opens on them with the deal drafted. */
  accept: (response: WtbResponse) => Promise<WtbResponse | null>;
  decline: (response: WtbResponse) => Promise<WtbResponse | null>;
}

/** Offers to sell on buy requests, both sides (contract v6). Signed out: a toast asks to sign in. */
export function useWtbOffers(source: 'priceCheck' | 'listItem' | 'market' | 'chat'): WtbOfferActions {
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const token = settings?.pd2Token || null;
  const account = settings?.account || null;

  const sell = useCallback(
    async (request: WtbRequest, item: WtbContactItem | null | undefined, ask?: WtbAsk) => {
      if (!token) return askSignIn() ?? false;
      try {
        const offer = await offerWtbRequest(token, request.id, wtbOfferBody(item, account, ask));
        upsertMyOffer(offer);
        trackEvent('wtb_offer_sent', { source, item: !!item, asked: !!ask });
        showToast({
          title: t('market:wtb.offers.sentToast', { buyer: request.buyer.name }),
          description: t('market:wtb.offers.sentToastDescription', {
            item: offer.item?.name ?? request.title,
            price: formatOffer(offer.price ?? request.offer),
          }),
          variant: 'success',
        });
        return true;
      } catch (error) {
        toastFailure(error, t('market:wtb.offers.failed'));
        return false;
      }
    },
    [token, account, source],
  );

  const withdraw = useCallback(
    async (offer: WtbResponse) => {
      if (!token) return void askSignIn();
      try {
        upsertMyOffer(await decideWtbOffer(token, offer.id, 'withdraw'));
        showToast({ title: t('market:wtb.offers.withdrawnToast') });
      } catch (error) {
        toastFailure(error, t('market:wtb.offers.decideFailed'));
      }
    },
    [token],
  );

  const decide = useCallback(
    async (response: WtbResponse, decision: 'accept' | 'decline') => {
      if (!token) return askSignIn();
      try {
        return await decideWtbOffer(token, response.id, decision);
      } catch (error) {
        toastFailure(error, t('market:wtb.offers.decideFailed'));
        return null;
      }
    },
    [token],
  );

  const accept = useCallback(
    async (response: WtbResponse) => {
      const decided = await decide(response, 'accept');
      if (decided && isWtbOffer(decided)) {
        trackEvent('wtb_offer_accepted', { source });
        openPanel(
          'chat',
          { userId: decided.seller.userId, userName: decided.seller.name, draft: dealDraft(decided), reply: true },
          { focus: true },
        );
      }
      return decided;
    },
    [decide, openPanel, source],
  );

  const decline = useCallback((response: WtbResponse) => decide(response, 'decline'), [decide]);

  return { sell, withdraw, accept, decline };
}
