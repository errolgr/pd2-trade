/**
 * The seller's own offers ("Sell for {offer}"), shared by every surface showing a request they could fill (Wanted
 * card and drawer, the price check and List item chips): read once per sign-in (`/responses?direction=made`), then
 * kept current by the user's own sends / withdrawals and the buyer's decisions pushed on the alerts stream.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { listWtbResponses } from '../alerts/wtb-api';
import type { WtbResponse } from '../lib/wtb';
import { latestOffer } from './wtb-offers';

/** Made responses read (newest first). */
const MADE_LIMIT = 50;

interface MyOffersState {
  token: string | null;
  offers: WtbResponse[];
  /** Read (or being read) for `token`: not again. */
  requested: boolean;
}

let state: MyOffersState = { token: null, offers: [], requested: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getOffers = () => state.offers;

/** One of the user's offers as it now stands (sent, replaced, withdrawn, accepted, declined). */
export function upsertMyOffer(offer: WtbResponse): void {
  state = { ...state, offers: [offer, ...state.offers.filter((o) => o.id !== offer.id)] };
  emit();
}

function load(token: string): void {
  if (state.token === token && state.requested) return;
  state = { token, offers: state.token === token ? state.offers : [], requested: true };
  emit();
  listWtbResponses(token, { direction: 'made', limit: MADE_LIMIT }).then(
    (page) => {
      if (state.token !== token) return;
      // Offers sent or decided while this loaded stay as they are now
      const known = new Set(state.offers.map((o) => o.id));
      state = { ...state, offers: [...state.offers, ...page.items.filter((o) => !known.has(o.id))] };
      emit();
    },
    (error) => {
      if (state.token !== token) return;
      console.warn('[wtb] your offers failed:', error);
      // A later use tries again
      state = { ...state, requested: false };
    },
  );
}

/** The user's latest offer on `requestId` (signed in; loads their offers on first use). */
export function useMyWtbOffer(requestId: string, token: string | null): WtbResponse | undefined {
  const offers = useSyncExternalStore(subscribe, getOffers);
  useEffect(() => {
    if (token) load(token);
  }, [token]);
  return token && state.token === token ? latestOffer(offers, requestId) : undefined;
}

/** Tests: forget everything. */
export function _resetMyOffers(): void {
  state = { token: null, offers: [], requested: false };
  emit();
}
