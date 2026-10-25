import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import qs from 'qs';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { changeChatPrefs, chatPrefsLoaded, useChatPrefs } from '@/lib/chat-prefs';
import { setBadgeCount } from '@/overlay';
import { newAcceptedOffers, recordAcceptedOffers } from '@/pages/chat/lib/offers-seen';
import type { TradeOffer } from '../useTradeOffers';
import type { ISettings } from '../useOptions';
import type { SubscribeSocket } from './useSocket';
import { handleApiResponse } from './usePD2Website';

const API_BASE = 'https://api.projectdiablo2.com';
/** Newest notifications read at sign-in (PD2 keeps acknowledged ones too; the unacknowledged are among them). */
const LOAD_LIMIT = 100;

export const OFFER_NOTIFICATION_TYPES = ['offer_received', 'offer_accepted', 'offer_revoked'] as const;
export type OfferNotificationType = (typeof OFFER_NOTIFICATION_TYPES)[number];

/**
 * A PD2 system notification about a market offer (the website's bell lists them until acknowledged):
 * `offer_received` an offer on your listing, `offer_accepted` the seller accepted your offer, `offer_revoked`
 * a buyer withdrew their offer on your listing. Read leniently: only `type` is relied on (the shapes of
 * accepted/revoked come from the website's code, not observed payloads).
 */
export interface OfferNotification {
  /** PD2's `_id`; a local one (`local:…`) when it has none, which can't be acknowledged on PD2. */
  id: string;
  type: OfferNotificationType;
  /** `data.listing_id`: the listing it is about. */
  listingId?: string;
  /** `meta.string`: the website's text for it. */
  text?: string;
  /** Epoch ms: `created_at`, else when it came in. */
  at: number;
}

const isOfferType = (type: unknown): type is OfferNotificationType =>
  (OFFER_NOTIFICATION_TYPES as readonly unknown[]).includes(type);

/** A `system/notification` record or push as an offer notification; undefined: another type, or acknowledged. */
export function toOfferNotification(raw: unknown, now: number): OfferNotification | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as {
    _id?: unknown;
    type?: unknown;
    data?: { listing_id?: unknown } | null;
    meta?: { string?: unknown } | null;
    created_at?: unknown;
    acknowledged_at?: unknown;
  };
  if (!isOfferType(record.type) || record.acknowledged_at) return undefined;
  const listingId = typeof record.data?.listing_id === 'string' ? record.data.listing_id : undefined;
  const createdAt = typeof record.created_at === 'string' ? Date.parse(record.created_at) : NaN;
  const at = Number.isNaN(createdAt) ? now : createdAt;
  return {
    id: typeof record._id === 'string' ? record._id : `local:${record.type}:${listingId ?? ''}:${at}`,
    type: record.type,
    listingId,
    text: typeof record.meta?.string === 'string' ? record.meta.string : undefined,
    at,
  };
}

/** The ones the offers badge counts: news for you (a withdrawn offer is not). */
export const isOfferNews = (notification: OfferNotification) => notification.type !== 'offer_revoked';

export interface OfferNotificationsApi {
  /** Unacknowledged offer notifications, oldest first. */
  offerNotifications: OfferNotification[];
  /** Fallback for a missed `offer_accepted` push: your offers newly seen accepted in the lists (offers-seen). */
  newAcceptedOffers: TradeOffer[];
  /** Acknowledges them on PD2 (the website's bell clears too); they leave the list right away. */
  acknowledgeOfferNotifications: (ids: readonly string[]) => void;
}

interface UseOfferNotificationsProps {
  settings: ISettings;
  userId: string | undefined;
  subscribeSocket: SubscribeSocket;
  isConnected: boolean;
  outgoingOffers: readonly TradeOffer[];
  onAuthError?: () => void | Promise<void>;
}

const byTime = (a: OfferNotification, b: OfferNotification) => a.at - b.at;

/**
 * PD2's offer notifications, as the website's bell has them: the unacknowledged ones are loaded at sign-in and on
 * every socket reconnect, the socket pushes new ones. Also keeps the accepted-offer fallback (offers-seen) up to
 * date from the offer lists. Publishes the `tradeOffers` badge: offers received and accepted, not looked at yet.
 */
export function useOfferNotifications({
  settings,
  userId,
  subscribeSocket,
  isConnected,
  outgoingOffers,
  onAuthError,
}: UseOfferNotificationsProps): OfferNotificationsApi {
  const token = settings?.pd2Token;
  const [notifications, setNotifications] = useState<OfferNotification[]>([]);
  // Acknowledged this session: a load still answering with them (the PATCH racing it) must not bring them back
  const acknowledgedRef = useRef(new Set<string>());
  // Pushed while a load was out: its answer may predate them
  const pushedRef = useRef(new Set<string>());
  // Listings of every offer_accepted notification this session: the fallback leaves their offers to them
  const [acceptedListings, setAcceptedListings] = useState<ReadonlySet<string>>(() => new Set());
  // A new callback must not reload the list
  const onAuthErrorRef = useRef(onAuthError);
  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  });

  const noteAccepted = useCallback((list: readonly OfferNotification[]) => {
    const listings = list.flatMap((n) => (n.type === 'offer_accepted' && n.listingId ? [n.listingId] : []));
    if (listings.length === 0) return;
    setAcceptedListings((current) =>
      listings.every((id) => current.has(id)) ? current : new Set([...current, ...listings]),
    );
  }, []);

  useEffect(() => {
    if (!userId || !token) {
      setNotifications([]);
      acknowledgedRef.current.clear();
      return;
    }
    let current = true;
    pushedRef.current.clear();
    const load = async () => {
      const query = qs.stringify(
        { user_id: userId, $sort: { created_at: -1 }, $limit: LOAD_LIMIT },
        { encodeValuesOnly: true },
      );
      const response = await tauriFetch(`${API_BASE}/system/notification?${query}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await handleApiResponse(response, onAuthErrorRef.current);
      if (!current) return;
      // Nothing (none yet, a 401) is fine: whatever was pushed stays
      const records: unknown[] = Array.isArray(result?.data) ? result.data : [];
      const now = Date.now();
      const loaded = records
        .map((record) => toOfferNotification(record, now))
        .filter((n): n is OfferNotification => !!n && !acknowledgedRef.current.has(n.id));
      noteAccepted(loaded);
      const loadedIds = new Set(loaded.map((n) => n.id));
      setNotifications((existing) =>
        [...loaded, ...existing.filter((n) => pushedRef.current.has(n.id) && !loadedIds.has(n.id))].sort(byTime),
      );
    };
    load().catch((error) => console.warn('[OfferNotifications] Could not load offer notifications:', error));
    return () => {
      current = false;
    };
    // isConnected: reload after an outage, whatever was pushed meanwhile is lost
  }, [userId, token, isConnected, noteAccepted]);

  useEffect(() => {
    if (!userId) return;
    return subscribeSocket<unknown>('system/notification_pushed', (raw) => {
      const notification = toOfferNotification(raw, Date.now());
      if (!notification || acknowledgedRef.current.has(notification.id)) return;
      pushedRef.current.add(notification.id);
      noteAccepted([notification]);
      setNotifications((existing) =>
        existing.some((n) => n.id === notification.id) ? existing : [...existing, notification].sort(byTime),
      );
    });
  }, [subscribeSocket, userId, noteAccepted]);

  const acknowledgeOfferNotifications = useCallback(
    (ids: readonly string[]) => {
      const fresh = ids.filter((id) => !acknowledgedRef.current.has(id));
      if (fresh.length === 0) return;
      fresh.forEach((id) => acknowledgedRef.current.add(id));
      setNotifications((existing) => existing.filter((n) => !fresh.includes(n.id)));
      const onServer = fresh.filter((id) => !id.startsWith('local:'));
      if (!token || onServer.length === 0) return;
      // The website's "Clear All": PATCH system/notification?_id[$in]=… { acknowledged_at }
      const query = qs.stringify({ _id: { $in: onServer } }, { arrayFormat: 'indices', encodeValuesOnly: true });
      void tauriFetch(`${API_BASE}/system/notification?${query}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_at: new Date().toJSON() }),
      })
        .then((response) => handleApiResponse(response, onAuthErrorRef.current))
        // Seen here either way; PD2 still lists them, so they come back with the next start
        .catch((error) => console.warn('[OfferNotifications] Could not acknowledge offer notifications:', error));
    },
    [token],
  );

  // The fallback: record your offers as the lists show them accepted (once the saved chat prefs are in)
  const chatPrefs = useChatPrefs();
  const prefsLoaded = chatPrefsLoaded();
  useEffect(() => {
    if (!prefsLoaded) return;
    changeChatPrefs((current) => recordAcceptedOffers(current, outgoingOffers, acceptedListings, Date.now()));
  }, [prefsLoaded, outgoingOffers, acceptedListings]);
  const unacknowledgedAccepted = useMemo(
    () => new Set(notifications.flatMap((n) => (n.type === 'offer_accepted' && n.listingId ? [n.listingId] : []))),
    [notifications],
  );
  const fallbackAccepted = useMemo(
    () => (prefsLoaded ? newAcceptedOffers(chatPrefs, outgoingOffers, unacknowledgedAccepted) : []),
    [prefsLoaded, chatPrefs, outgoingOffers, unacknowledgedAccepted],
  );

  const badgeCount = notifications.filter(isOfferNews).length + fallbackAccepted.length;
  useEffect(() => {
    setBadgeCount('tradeOffers', badgeCount);
  }, [badgeCount]);

  return { offerNotifications: notifications, newAcceptedOffers: fallbackAccepted, acknowledgeOfferNotifications };
}
