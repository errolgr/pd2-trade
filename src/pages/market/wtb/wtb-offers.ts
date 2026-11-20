/**
 * Offers to sell on buy requests (contract "WTB offers v6": "Sell for {offer}"): the seller's button state, the
 * price rule, what a failed send means, and the buyer's card / notification copy. Pure: no React.
 */
import { t } from '@/i18n';
import { type CustomToastPayload, ToastActionType } from '@/common/types/Events';
import { MarketApiError } from '../alerts/market-api';
import { formatOffer, isWtbOffer, type WtbOffer, type WtbRequest, type WtbResponse } from '../lib/wtb';
import type { MarketPanelPayload } from '../lib/types';

/** The seller's latest offer on a request (made responses, newest first or not), if any. */
export function latestOffer(made: readonly WtbResponse[], requestId: string): WtbResponse | undefined {
  return made
    .filter((r) => r.requestId === requestId && isWtbOffer(r))
    .reduce<
      WtbResponse | undefined
    >((a, b) => (a && Date.parse(a.createdAt) >= Date.parse(b.createdAt) ? a : b), undefined);
}

/**
 * The seller's primary button: Sell (no offer yet, or the last one withdrawn), "Offer sent · pending" with
 * Withdraw, "Accepted · message {buyer}", or "Declined" (muted, Sell offered again).
 */
export type SellState =
  | { kind: 'sell' }
  | { kind: 'pending'; offer: WtbResponse }
  | { kind: 'accepted'; offer: WtbResponse }
  | { kind: 'declined'; offer: WtbResponse };

export function sellState(offer: WtbResponse | undefined): SellState {
  switch (offer?.status) {
    case 'pending':
      return { kind: 'pending', offer };
    case 'accepted':
      return { kind: 'accepted', offer };
    case 'declined':
      return { kind: 'declined', offer };
    default:
      return { kind: 'sell' };
  }
}

const samePrice = (a: Pick<WtbOffer, 'amount' | 'currency'>, b: Pick<WtbOffer, 'amount' | 'currency'>) =>
  a.amount === b.amount && a.currency === b.currency;

/**
 * Whether a price can be offered: the request's own price always ("at your price"), another one only when the
 * buyer is open to offers (the server says 400 `fixedPrice` otherwise).
 */
export function offerPriceRule(
  request: Pick<WtbRequest, 'offer' | 'openToOffers'>,
  price: Pick<WtbOffer, 'amount' | 'currency'>,
): 'theirPrice' | 'ask' | 'fixedPrice' {
  if (samePrice(price, request.offer)) return 'theirPrice';
  return request.openToOffers ? 'ask' : 'fixedPrice';
}

/** What a failed offer (or decision) tells the user. */
export type OfferFailure = 'fixedPrice' | 'notOpen' | 'throttled' | 'failed';

export function offerFailure(error: unknown): OfferFailure {
  if (!(error instanceof MarketApiError)) return 'failed';
  if (error.status === 400 && error.rule === 'fixedPrice') return 'fixedPrice';
  if (error.status === 409) return 'notOpen';
  if (error.status === 429) return 'throttled';
  return 'failed';
}

/** The item an offer is for: the seller's item, else the request's title ("I have one"). */
const offerItem = (response: WtbResponse) => response.item?.name ?? response.request.title;

/** At the buyer's own price (their offer), or asking another one. */
export const atTheirPrice = (response: WtbResponse & { price: WtbOffer }) =>
  samePrice(response.price, response.request.offer);

/**
 * The buyer's offer card line: "{seller} will sell {item} · {price} (your price)" or "{seller} asks {price} for
 * {item} (you offered {offer})".
 */
export function offerCardLine(response: WtbResponse & { price: WtbOffer }): string {
  const vars = { seller: response.seller.name, item: offerItem(response), price: formatOffer(response.price) };
  return atTheirPrice(response)
    ? t('market:wtb.offers.willSell', vars)
    : t('market:wtb.offers.asks', { ...vars, offer: formatOffer(response.request.offer) });
}

/** The buyer's Accept: "Accept", or "Accept {price}" when it isn't their price. */
export const acceptLabel = (response: WtbResponse & { price: WtbOffer }) =>
  atTheirPrice(response)
    ? t('market:wtb.offers.accept')
    : t('market:wtb.offers.acceptPrice', { price: formatOffer(response.price) });

/** The chat draft once the buyer accepts. */
export const dealDraft = (response: WtbResponse & { price: WtbOffer }) =>
  t('market:wtb.offers.dealDraft', { item: offerItem(response), price: formatOffer(response.price) });

/** The buyer's notification title for an offer (instead of the contact one). */
export function offerNoticeTitle(response: WtbResponse & { price: WtbOffer }): string {
  const vars = { seller: response.seller.name, item: offerItem(response), price: formatOffer(response.price) };
  return atTheirPrice(response) ? t('market:wtb.offers.noticeWillSell', vars) : t('market:wtb.offers.noticeAsks', vars);
}

/**
 * The toast for a `wtb.offer` event: to the seller when the buyer accepted (Message {buyer}) or declined (View
 * request); to the buyer when the seller withdrew. Null for a status nobody is told about.
 */
export function offerDecisionToast(response: WtbResponse, durationMs: number): CustomToastPayload | null {
  const { buyer, title } = response.request;
  const viewRequest = {
    label: t('market:wtb.response.viewRequest'),
    type: ToastActionType.OPEN_MARKET_PANEL,
    data: { requestId: response.requestId } satisfies MarketPanelPayload,
  };
  switch (response.status) {
    case 'accepted':
      return {
        title: t('market:wtb.offers.acceptedBy', { buyer: buyer.name, title }),
        duration: durationMs,
        action: {
          label: t('market:wtb.offers.messageBuyer', { buyer: buyer.name }),
          type: ToastActionType.OPEN_CHAT_CONVERSATION,
          data: { userId: buyer.userId, userName: buyer.name },
        },
      };
    case 'declined':
      return {
        title: t('market:wtb.offers.declinedBy', { buyer: buyer.name, title }),
        duration: durationMs,
        action: viewRequest,
      };
    case 'withdrawn':
      return {
        title: t('market:wtb.offers.withdrawnBy', { seller: response.seller.name, title }),
        duration: durationMs,
        action: viewRequest,
      };
    default:
      return null;
  }
}
