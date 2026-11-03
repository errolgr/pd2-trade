// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { chatPrefsLoaded, getChatPrefs, resetChatPrefs } from '@/lib/chat-prefs';
import { setBadgeCount } from '@/overlay';
import type { TradeOffer } from '../useTradeOffers';
import type { ISettings } from '../useOptions';
import type { SubscribeSocket } from './useSocket';
import { toOfferNotification, useOfferNotifications } from './useOfferNotifications';

vi.mock('@/overlay', () => ({ setBadgeCount: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
// Same contract as the real handleApiResponse: ok → JSON body, 401 → onAuthError() and null, else throw.
vi.mock('./usePD2Website', () => ({
  handleApiResponse: async (response: Response, onAuthError?: () => void | Promise<void>) => {
    if (response.ok) return response.json();
    if (response.status === 401) {
      await onAuthError?.();
      return null;
    }
    throw new Error(`API Error: ${response.status}`);
  },
}));
vi.mock('@/lib/browser-fs', () => ({
  BaseDirectory: { AppConfig: 13 },
  exists: vi.fn(async () => false),
  mkdir: vi.fn(async () => {}),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(async () => {}),
}));

const fetchMock = vi.mocked(tauriFetch);
const badgeMock = vi.mocked(setBadgeCount);
const settings = { pd2Token: 'tok' } as ISettings;

function apiResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const record = (id: string, type: string, extra: object = {}) => ({
  _id: id,
  type,
  data: { listing_id: `L-${id}` },
  meta: { string: `text ${id}` },
  created_at: '2026-10-20T10:00:00.000Z',
  ...extra,
});

let handlers: Map<string, Set<(payload: unknown) => void>>;
const subscribeSocket: SubscribeSocket = (type, handler) => {
  let set = handlers.get(type);
  if (!set) handlers.set(type, (set = new Set()));
  set.add(handler as (payload: unknown) => void);
  return () => set!.delete(handler as (payload: unknown) => void);
};
const push = (payload: unknown) =>
  act(() => handlers.get('system/notification_pushed')?.forEach((handler) => handler(payload)));

const lastBadge = () => badgeMock.mock.calls.filter(([key]) => key === 'tradeOffers').at(-1)?.[1];

interface Props {
  userId: string | undefined;
  isConnected: boolean;
  outgoingOffers: readonly TradeOffer[];
}
const noOffers: TradeOffer[] = [];

function renderNotifications(initial: Partial<Props> = {}) {
  return renderHook(
    (props: Props) => useOfferNotifications({ settings, subscribeSocket, ...props }),
    { initialProps: { userId: 'me', isConnected: true, outgoingOffers: noOffers, ...initial } },
  );
}

const getCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'GET');
const patchCalls = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH');

beforeEach(() => {
  resetChatPrefs();
  handlers = new Map();
  fetchMock.mockReset();
  badgeMock.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('toOfferNotification', () => {
  const now = 1_000_000;

  it('reads a full record', () => {
    expect(toOfferNotification(record('n1', 'offer_received'), now)).toEqual({
      id: 'n1',
      type: 'offer_received',
      listingId: 'L-n1',
      text: 'text n1',
      at: Date.parse('2026-10-20T10:00:00.000Z'),
    });
  });

  it('is lenient about missing fields', () => {
    expect(toOfferNotification({ type: 'offer_accepted', data: { listing_id: 'L9' } }, now)).toEqual({
      id: `local:offer_accepted:L9:${now}`,
      type: 'offer_accepted',
      listingId: 'L9',
      text: undefined,
      at: now,
    });
    const bare = toOfferNotification({ type: 'offer_revoked', data: null, meta: null }, now);
    expect(bare?.id.startsWith('local:')).toBe(true);
    expect(bare).toMatchObject({ type: 'offer_revoked', listingId: undefined, text: undefined, at: now });
    expect(toOfferNotification({ _id: 'x', type: 'offer_received', created_at: 'garbage' }, now)?.at).toBe(now);
  });

  it('drops other types, acknowledged ones and non-objects', () => {
    expect(toOfferNotification(record('n1', 'friend_request'), now)).toBeUndefined();
    expect(toOfferNotification({ _id: 'n1' }, now)).toBeUndefined();
    expect(
      toOfferNotification(record('n1', 'offer_received', { acknowledged_at: '2026-10-21T00:00:00Z' }), now),
    ).toBeUndefined();
    for (const raw of [null, undefined, 'offer_received', 42, true]) {
      expect(toOfferNotification(raw, now)).toBeUndefined();
    }
  });
});

describe('useOfferNotifications', () => {
  it('loads the unacknowledged offer notifications at sign-in', async () => {
    fetchMock.mockResolvedValue(
      apiResponse({
        total: 4,
        data: [
          record('a', 'offer_received', { created_at: '2026-10-20T12:00:00.000Z' }),
          record('b', 'offer_accepted', { created_at: '2026-10-20T11:00:00.000Z' }),
          record('c', 'offer_received', { acknowledged_at: '2026-10-20T13:00:00.000Z' }),
          record('d', 'whisper'),
          record('e', 'offer_revoked'),
        ],
      }),
    );
    const { result } = renderNotifications();
    await waitFor(() => expect(result.current.offerNotifications).toHaveLength(3));
    // oldest first
    expect(result.current.offerNotifications.map((n) => n.id)).toEqual(['e', 'b', 'a']);

    const [url, init] = getCalls()[0];
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe('https://api.projectdiablo2.com/system/notification');
    expect(parsed.searchParams.get('user_id')).toBe('me');
    expect(parsed.searchParams.get('$sort[created_at]')).toBe('-1');
    expect(parsed.searchParams.get('$limit')).toBe('100');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    // received + accepted, not revoked
    await waitFor(() => expect(lastBadge()).toBe(2));
  });

  it.each([
    ['an empty answer', () => Promise.resolve(apiResponse({ total: 0, data: [] }))],
    ['a body without data', () => Promise.resolve(apiResponse({ total: 0 }))],
    ['a failing fetch', () => Promise.reject(new Error('offline'))],
    ['a server error', () => Promise.resolve(apiResponse({}, 500))],
  ])('leaves an empty list on %s', async (_, answer) => {
    fetchMock.mockImplementation(answer);
    const { result } = renderNotifications();
    await waitFor(() => expect(getCalls()).toHaveLength(1));
    await act(async () => {});
    expect(result.current.offerNotifications).toEqual([]);
    expect(lastBadge()).toBe(0);
  });

  it('adds pushed notifications once and bumps the badge', async () => {
    fetchMock.mockResolvedValue(apiResponse({ total: 0, data: [] }));
    const { result } = renderNotifications();
    await waitFor(() => expect(getCalls()).toHaveLength(1));
    await act(async () => {});

    push(record('p1', 'offer_received'));
    expect(result.current.offerNotifications.map((n) => n.id)).toEqual(['p1']);
    expect(lastBadge()).toBe(1);
    push(record('p1', 'offer_received'));
    push(record('x', 'friend_request'));
    expect(result.current.offerNotifications).toHaveLength(1);
    push(record('p2', 'offer_accepted'));
    push(record('p3', 'offer_revoked'));
    expect(result.current.offerNotifications).toHaveLength(3);
    expect(lastBadge()).toBe(2);
  });

  it('reloads when the connection changes and clears on sign-out', async () => {
    fetchMock.mockResolvedValue(apiResponse({ total: 1, data: [record('a', 'offer_received')] }));
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(result.current.offerNotifications).toHaveLength(1));
    expect(getCalls()).toHaveLength(1);

    fetchMock.mockResolvedValue(
      apiResponse({ total: 2, data: [record('a', 'offer_received'), record('b', 'offer_received')] }),
    );
    rerender({ userId: 'me', isConnected: false, outgoingOffers: noOffers });
    await waitFor(() => expect(result.current.offerNotifications).toHaveLength(2));
    expect(getCalls()).toHaveLength(2);

    rerender({ userId: undefined, isConnected: false, outgoingOffers: noOffers });
    expect(result.current.offerNotifications).toEqual([]);
    await waitFor(() => expect(lastBadge()).toBe(0));
    expect(getCalls()).toHaveLength(2);
  });

  it('acknowledges: gone right away, PATCHed on PD2 (not local ones), and stays gone', async () => {
    fetchMock.mockImplementation(async (_url, init) =>
      init?.method === 'PATCH'
        ? apiResponse({})
        : apiResponse({ total: 2, data: [record('a', 'offer_received'), record('b', 'offer_received')] }),
    );
    const { result, rerender } = renderNotifications();
    await waitFor(() => expect(result.current.offerNotifications).toHaveLength(2));
    push({ type: 'offer_received', data: { listing_id: 'L7' } });
    const local = result.current.offerNotifications.find((n) => n.id.startsWith('local:'))!;
    expect(local).toBeDefined();

    act(() => result.current.acknowledgeOfferNotifications(['a', local.id]));
    expect(result.current.offerNotifications.map((n) => n.id)).toEqual(['b']);
    expect(patchCalls()).toHaveLength(1);
    const [url, init] = patchCalls()[0];
    expect(decodeURIComponent(url as string)).toBe('https://api.projectdiablo2.com/system/notification?_id[$in][0]=a');
    const body = JSON.parse(init?.body as string);
    expect(new Date(body.acknowledged_at).toJSON()).toBe(body.acknowledged_at);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    await waitFor(() => expect(lastBadge()).toBe(1));

    // only local ones: no PATCH
    act(() => result.current.acknowledgeOfferNotifications([local.id]));
    expect(patchCalls()).toHaveLength(1);

    // a later load still answering with 'a' does not bring it back
    rerender({ userId: 'me', isConnected: false, outgoingOffers: noOffers });
    await waitFor(() => expect(getCalls()).toHaveLength(2));
    await act(async () => {});
    expect(result.current.offerNotifications.map((n) => n.id)).toEqual(['b']);
  });

  describe('accepted-offer fallback', () => {
    const offer = (extra: Partial<TradeOffer> = {}): TradeOffer => ({
      id: 'o1',
      isIncoming: false,
      playerName: 'seller',
      timestamp: new Date('2026-10-20T10:00:00Z'),
      listingId: 'L1',
      userId: 'seller-id',
      ...extra,
    });
    const pending = [offer()];
    const accepted = [offer({ acceptedOfferId: 'o1', listingClosed: false })];

    async function trackThenAccept(answer: unknown) {
      fetchMock.mockResolvedValue(apiResponse(answer));
      const hook = renderNotifications({ outgoingOffers: pending });
      await waitFor(() => expect(chatPrefsLoaded()).toBe(true));
      await waitFor(() => expect(getChatPrefs().acceptedOffers).toEqual({}));
      await act(async () => {});
      hook.rerender({ userId: 'me', isConnected: true, outgoingOffers: accepted });
      return hook;
    }

    it('counts an offer seen accepted after tracking started', async () => {
      const { result } = await trackThenAccept({ total: 0, data: [] });
      await waitFor(() => expect(result.current.newAcceptedOffers.map((o) => o.id)).toEqual(['o1']));
      expect(getChatPrefs().acceptedOffers?.o1).toBeGreaterThan(0);
      await waitFor(() => expect(lastBadge()).toBe(1));
    });

    it('does not double count an offer with an unacknowledged offer_accepted notification', async () => {
      const { result } = await trackThenAccept({
        total: 1,
        data: [record('n', 'offer_accepted', { data: { listing_id: 'L1' } })],
      });
      await waitFor(() => expect(result.current.offerNotifications).toHaveLength(1));
      await act(async () => {});
      expect(result.current.newAcceptedOffers).toEqual([]);
      expect(getChatPrefs().acceptedOffers).toHaveProperty('o1');
      await waitFor(() => expect(lastBadge()).toBe(1));
    });
  });
});
