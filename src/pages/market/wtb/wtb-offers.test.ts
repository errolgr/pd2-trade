import { describe, expect, it } from 'vitest';
import { ToastActionType } from '@/common/types/Events';
import { MarketApiError } from '../alerts/market-api';
import { isWtbOffer, type WtbOffer, type WtbResponse } from '../lib/wtb';
import {
  acceptLabel,
  dealDraft,
  latestOffer,
  offerCardLine,
  offerDecisionToast,
  offerFailure,
  offerNoticeTitle,
  offerPriceRule,
  sellState,
} from './wtb-offers';

const PRICE: WtbOffer = { amount: 2, currency: 'HR', hr: 2 };
const offer = (over: Partial<WtbResponse> = {}): WtbResponse & { price: WtbOffer } => {
  const response: WtbResponse = {
    id: 'o1',
    requestId: 'req1',
    request: {
      id: 'req1',
      title: 'Rare Circlet',
      offer: PRICE,
      status: 'open',
      buyer: { userId: 'buyer', name: 'Errol' },
      whisperTo: 'ErrolAcc',
    },
    seller: { userId: 'seller', name: 'HammerTime', account: 'HammerAcc' },
    item: { name: 'Grim Visage', quality: 'Rare', baseCode: 'ci0' },
    met: [],
    channel: 'message',
    createdAt: '2026-11-20T10:00:00Z',
    dismissed: false,
    kind: 'offer',
    price: PRICE,
    note: null,
    status: 'pending',
    decidedAt: null,
    ...over,
  };
  if (!isWtbOffer(response)) throw new Error('not an offer');
  return response;
};

describe('seller button state', () => {
  it('Sell without an offer or after a withdrawal; then pending, accepted, declined (Sell again)', () => {
    expect(sellState(undefined)).toEqual({ kind: 'sell' });
    expect(sellState(offer({ status: 'withdrawn' }))).toEqual({ kind: 'sell' });
    expect(sellState(offer()).kind).toBe('pending');
    expect(sellState(offer({ status: 'accepted' })).kind).toBe('accepted');
    expect(sellState(offer({ status: 'declined' })).kind).toBe('declined');
  });

  it("the user's latest offer on a request (contacts and other requests left out)", () => {
    const older = offer({ id: 'old', status: 'declined', createdAt: '2026-11-19T10:00:00Z' });
    const newer = offer({ id: 'new' });
    const contact = { ...offer({ id: 'c', createdAt: '2026-11-21T10:00:00Z' }), kind: 'contact' as const, price: null };
    const other = offer({ id: 'x', requestId: 'req2', createdAt: '2026-11-22T10:00:00Z' });
    expect(latestOffer([older, contact, newer, other], 'req1')?.id).toBe('new');
    expect(latestOffer([other], 'req1')).toBeUndefined();
  });
});

describe('price rule', () => {
  it('their own price always; another one only when open to offers', () => {
    expect(offerPriceRule({ offer: PRICE, openToOffers: false }, { amount: 2, currency: 'HR' })).toBe('theirPrice');
    expect(offerPriceRule({ offer: PRICE, openToOffers: true }, { amount: 3, currency: 'HR' })).toBe('ask');
    expect(offerPriceRule({ offer: PRICE, openToOffers: false }, { amount: 2, currency: 'Ist' })).toBe('fixedPrice');
  });

  it('failures: 400 fixedPrice, 409 not open, 429 throttled, anything else failed', () => {
    expect(offerFailure(new MarketApiError('fixed', 400, null, 'fixedPrice'))).toBe('fixedPrice');
    expect(offerFailure(new MarketApiError('closed', 409))).toBe('notOpen');
    expect(offerFailure(new MarketApiError('slow down', 429, 1000))).toBe('throttled');
    expect(offerFailure(new MarketApiError('own', 400))).toBe('failed');
    expect(offerFailure(new Error('offline'))).toBe('failed');
  });
});

describe('buyer card copy', () => {
  it('at their price, or asking another one', () => {
    expect(offerCardLine(offer())).toBe('HammerTime will sell Grim Visage · 2 HR (your price)');
    expect(acceptLabel(offer())).toBe('Accept');
    const asks = offer({ price: { amount: 1, currency: 'Ber', hr: 3 } });
    expect(offerCardLine(asks)).toBe('HammerTime asks 1 Ber for Grim Visage (you offered 2 HR)');
    expect(acceptLabel(asks)).toBe('Accept 1 Ber');
  });

  it('without an item it is the request itself ("I have one")', () => {
    expect(offerCardLine(offer({ item: null }))).toBe('HammerTime will sell Rare Circlet · 2 HR (your price)');
  });

  it('notification titles and the deal draft', () => {
    expect(offerNoticeTitle(offer())).toBe('🏷 HammerTime will sell you Grim Visage for 2 HR');
    expect(offerNoticeTitle(offer({ price: { amount: 1, currency: 'Ber', hr: 3 } }))).toBe(
      '🏷 HammerTime asks 1 Ber for Grim Visage',
    );
    expect(dealDraft(offer())).toBe('Deal — Grim Visage for 2 HR. When can you trade?');
  });
});

describe('decision notifications', () => {
  it('to the seller: accepted (Message the buyer) or declined (View request)', () => {
    expect(offerDecisionToast(offer({ status: 'accepted' }), 8000)).toEqual({
      title: 'Errol accepted your offer for Rare Circlet',
      duration: 8000,
      action: {
        label: 'Message Errol',
        type: ToastActionType.OPEN_CHAT_CONVERSATION,
        data: { userId: 'buyer', userName: 'Errol' },
      },
    });
    expect(offerDecisionToast(offer({ status: 'declined' }), 8000)).toMatchObject({
      title: 'Errol declined your offer for Rare Circlet',
      action: { type: ToastActionType.OPEN_MARKET_PANEL, data: { requestId: 'req1' } },
    });
  });

  it('to the buyer: withdrawn; nothing for a pending one', () => {
    expect(offerDecisionToast(offer({ status: 'withdrawn' }), 8000)?.title).toBe(
      'HammerTime withdrew their offer for Rare Circlet',
    );
    expect(offerDecisionToast(offer(), 8000)).toBeNull();
  });
});
