// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@/overlay';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { getDeletedOffers, markOfferAsDeleted } from '@/lib/deleted-offers-storage';
import type { AuthData } from '@/common/types/pd2-website/AuthResponse';
import type { ISettings } from './useOptions';
import { useTradeOffers } from './useTradeOffers';

vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
// The real module drags in the whole PD2 website provider; this stub keeps handleApiResponse's contract:
// ok → JSON body, 401 → onAuthError() and null, anything else → throw.
vi.mock('./pd2website/usePD2Website', () => ({
  handleApiResponse: async (response: Response, onAuthError?: () => void | Promise<void>) => {
    if (response.ok) return response.json();
    if (response.status === 401) {
      await onAuthError?.();
      return null;
    }
    throw new Error(`API Error: ${response.status}`);
  },
}));

const settings = { pd2Token: 'tok' } as ISettings;
const authData = { accessToken: 'tok', user: { _id: 'me', username: 'me' } } as AuthData;

function apiResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

function incomingListing(offers: object[], extra: object = {}) {
  return {
    _id: 'L1',
    user_id: 'me',
    item: { name: 'Shako' },
    offers,
    ...extra,
  };
}

function websiteOffer(id: string, extra: object = {}) {
  return {
    _id: id,
    offer: '2 ist',
    user_id: 'buyer',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
    user: { _id: `user-${id}`, username: `buyer-${id}`, game: { accounts: [`acc-${id}`] } },
    ...extra,
  };
}

function outgoingOffer(id: string, extra: object = {}) {
  return {
    _id: id,
    offer: '1 ber',
    user_id: 'me',
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
    listing: {
      _id: `listing-${id}`,
      item: { name: `Item ${id}` },
      user: { _id: `seller-${id}`, username: `seller-${id}` },
    },
    ...extra,
  };
}

interface Api {
  incoming: () => Promise<Response> | Response;
  outgoing: () => Promise<Response> | Response;
  patch: (url: string, body: unknown) => Promise<Response> | Response;
}

let api: Api;

function patchCalls() {
  return vi
    .mocked(tauriFetch)
    .mock.calls.filter(([, init]) => init?.method === 'PATCH')
    .map(([url, init]) => [
      String(url).replace('https://api.projectdiablo2.com/market/', ''),
      JSON.parse(String(init?.body)),
    ]);
}

function toasts() {
  return vi.mocked(showToast).mock.calls.map(([payload]) => payload);
}

async function renderOffers(
  props: { settings?: ISettings; authData?: AuthData | null; onAuthError?: () => void } = {},
) {
  const hook = renderHook(() => useTradeOffers({ settings, authData, ...props }));
  await act(async () => {});
  return hook;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  api = {
    incoming: () => apiResponse({ data: [] }),
    outgoing: () => apiResponse({ data: [] }),
    patch: () => apiResponse({}),
  };
  vi.mocked(tauriFetch).mockImplementation(async (input, init) => {
    const url = String(input);
    if (init?.method === 'PATCH') return api.patch(url, JSON.parse(String(init.body)));
    if (url.startsWith('https://api.projectdiablo2.com/market/listing?')) return api.incoming();
    if (url.startsWith('https://api.projectdiablo2.com/market/offer?')) return api.outgoing();
    throw new Error(`unexpected fetch ${url}`);
  });
});

afterEach(() => {
  cleanup();
});

describe('useTradeOffers fetching', () => {
  it('maps incoming offers, skipping rejected ones and formatting HR-only offers', async () => {
    api.incoming = () =>
      apiResponse({
        data: [
          incomingListing(
            [
              websiteOffer('o1'),
              websiteOffer('o2', { rejected: true }),
              websiteOffer('o3', { offer: '', hr_offer: 3, user: undefined }),
            ],
            { accepted_offer_id: 'o1' },
          ),
          incomingListing([], { _id: 'L2' }),
        ],
      });
    const { result } = await renderOffers();

    expect(
      result.current.incomingOffers.map((o) => [o.id, o.playerName, o.price, o.hrOffer, o.acceptedOfferId]),
    ).toEqual([
      ['o1', 'buyer-o1', '2 ist', undefined, 'o1'],
      ['o3', 'Unknown', '3 HR', 3, 'o1'],
    ]);
    expect(result.current.incomingOffers[0]).toMatchObject({
      isIncoming: true,
      accountName: 'acc-o1',
      itemName: 'Shako',
      listingId: 'L1',
      userId: 'user-o1',
      timestamp: new Date('2026-10-18T10:00:00Z'),
    });
  });

  it('maps outgoing offers, falling back to the archived listing when the listing is gone', async () => {
    api.outgoing = () =>
      apiResponse({
        data: [
          outgoingOffer('a'),
          outgoingOffer('b', {
            listing: undefined,
            listing_archive: {
              _id: 'arch',
              accepted_offer_id: 'b',
              item: { name: 'Arach' },
              user: { _id: 's', username: 'Seller' },
            },
          }),
          outgoingOffer('c', { rejected: true }),
        ],
      });
    const { result } = await renderOffers();

    expect(
      result.current.outgoingOffers.map((o) => [
        o.id,
        o.isIncoming,
        o.playerName,
        o.itemName,
        o.listingId,
        o.acceptedOfferId,
        o.listingClosed,
      ]),
    ).toEqual([
      ['a', false, 'seller-a', 'Item a', 'listing-a', undefined, false],
      ['b', false, 'Seller', 'Arach', 'arch', 'b', true],
    ]);
  });

  it.each([
    ['no auth data', { authData: null }],
    ['no token', { settings: {} as ISettings }],
  ])('does not fetch with %s', async (_label, props) => {
    const { result } = await renderOffers(props);
    await act(async () => result.current.refresh());
    expect(tauriFetch).not.toHaveBeenCalled();
  });

  it('clears offers when a refetch fails', async () => {
    api.incoming = () => apiResponse({ data: [incomingListing([websiteOffer('o1')])] });
    api.outgoing = () => apiResponse({ data: [outgoingOffer('a')] });
    const { result } = await renderOffers();
    expect(result.current.incomingOffers).toHaveLength(1);

    api.incoming = () => apiResponse(null, 500);
    api.outgoing = () => apiResponse(null, 500);
    await act(async () => result.current.refresh());

    expect(result.current.incomingOffers).toEqual([]);
    expect(result.current.outgoingOffers).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('calls onAuthError on 401 and shows no offers', async () => {
    const onAuthError = vi.fn();
    api.incoming = () => apiResponse(null, 401);
    api.outgoing = () => apiResponse(null, 401);
    const { result } = await renderOffers({ onAuthError });

    expect(onAuthError).toHaveBeenCalledTimes(2);
    expect(result.current.incomingOffers).toEqual([]);
    expect(result.current.outgoingOffers).toEqual([]);
  });

  it('refetches both lists on refresh()', async () => {
    const { result } = await renderOffers();
    api.incoming = () => apiResponse({ data: [incomingListing([websiteOffer('new')])] });
    api.outgoing = () => apiResponse({ data: [outgoingOffer('x')] });

    await act(async () => result.current.refresh());
    expect(result.current.incomingOffers.map((o) => o.id)).toEqual(['new']);
    expect(result.current.outgoingOffers.map((o) => o.id)).toEqual(['x']);
  });

  // BUG: useTradeOffers.tsx:330-342/344-375 — incoming and outgoing fetches share one `loading` flag, so
  // whichever finishes first clears it while the other request is still in flight.
  it.fails('stays loading until both incoming and outgoing requests finish', async () => {
    const outgoing = Promise.withResolvers<Response>();
    api.outgoing = () => outgoing.promise;
    const { result } = await renderOffers();

    expect(result.current.loading).toBe(true);
    await act(async () => outgoing.resolve(apiResponse({ data: [] })));
  });
});

describe('useTradeOffers hidden outgoing offers', () => {
  it('splits hidden offers out and forgets hidden ids the API no longer returns', async () => {
    markOfferAsDeleted('a');
    markOfferAsDeleted('gone');
    api.outgoing = () => apiResponse({ data: [outgoingOffer('a'), outgoingOffer('b')] });
    const { result } = await renderOffers();

    expect(result.current.outgoingOffers.map((o) => o.id)).toEqual(['b']);
    expect(result.current.hiddenOutgoingOffers.map((o) => o.id)).toEqual(['a']);
    expect([...getDeletedOffers()]).toEqual(['a']);
  });

  it('hides an offer persistently and restores it', async () => {
    api.outgoing = () => apiResponse({ data: [outgoingOffer('a'), outgoingOffer('b')] });
    const first = await renderOffers();

    act(() => first.result.current.deleteOutgoingOffer('a'));
    expect(first.result.current.outgoingOffers.map((o) => o.id)).toEqual(['b']);
    expect(first.result.current.hiddenOutgoingOffers.map((o) => o.id)).toEqual(['a']);
    expect(toasts().at(-1)).toMatchObject({ title: 'Offer Hidden', description: expect.stringContaining('Item a') });
    first.unmount();

    // A fresh mount (app restart) still hides it.
    const second = await renderOffers();
    expect(second.result.current.hiddenOutgoingOffers.map((o) => o.id)).toEqual(['a']);

    act(() => second.result.current.restoreOutgoingOffer('a'));
    expect(second.result.current.outgoingOffers.map((o) => o.id)).toEqual(['b', 'a']);
    expect(second.result.current.hiddenOutgoingOffers).toEqual([]);
    expect(getDeletedOffers().size).toBe(0);
  });
});

describe('useTradeOffers actions', () => {
  it('revokes optimistically, then confirms and refreshes', async () => {
    let outgoingData = [outgoingOffer('a'), outgoingOffer('b')];
    api.outgoing = () => apiResponse({ data: outgoingData });
    const patch = Promise.withResolvers<Response>();
    api.patch = () => patch.promise;
    const { result } = await renderOffers();

    let revoke!: Promise<void>;
    act(() => {
      revoke = result.current.revokeOffer('a');
    });
    expect(result.current.outgoingOffers.map((o) => o.id)).toEqual(['b']);

    outgoingData = [outgoingOffer('b')];
    await act(async () => {
      patch.resolve(apiResponse({}));
      await revoke;
    });

    expect(patchCalls()).toEqual([['offer/a', { rejected: true }]]);
    expect(toasts()).toEqual([
      { title: 'Offer Revoked', description: 'Your offer on Item a has been revoked', variant: 'success' },
    ]);
    expect(result.current.outgoingOffers.map((o) => o.id)).toEqual(['b']);
  });

  it('restores a revoked offer from the server and rethrows when revoking fails', async () => {
    api.outgoing = () => apiResponse({ data: [outgoingOffer('a')] });
    api.patch = () => apiResponse(null, 500);
    const { result } = await renderOffers();

    await act(async () => {
      await expect(result.current.revokeOffer('a')).rejects.toThrow('API Error: 500');
    });

    expect(result.current.outgoingOffers.map((o) => o.id)).toEqual(['a']);
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Failed to Revoke Offer', variant: 'error' })]);
  });

  it('accepts an offer on its listing and names the buyer in the toast', async () => {
    api.incoming = () => apiResponse({ data: [incomingListing([websiteOffer('o1')])] });
    const { result } = await renderOffers();

    await act(() => result.current.acceptOffer('L1', 'o1'));

    expect(patchCalls()).toEqual([['listing/L1', { accepted_offer_id: 'o1' }]]);
    expect(toasts()).toEqual([
      { title: 'Offer Accepted', description: "You accepted buyer-o1's offer on Shako", variant: 'success' },
    ]);
  });

  it('settles an accept only once the refetched offers show it', async () => {
    let accepted = false;
    const refetch = Promise.withResolvers<void>();
    api.incoming = async () => {
      if (accepted) await refetch.promise;
      return apiResponse({
        data: [incomingListing([websiteOffer('o1')], accepted ? { accepted_offer_id: 'o1' } : {})],
      });
    };
    const { result } = await renderOffers();
    accepted = true;

    let settled = false;
    let accept!: Promise<void>;
    await act(async () => {
      accept = result.current.acceptOffer('L1', 'o1').then(() => {
        settled = true;
      });
    });
    expect(settled).toBe(false);

    await act(async () => {
      refetch.resolve();
      await accept;
    });
    expect(result.current.incomingOffers[0].acceptedOfferId).toBe('o1');
  });

  it('rethrows and shows an error toast when accepting fails', async () => {
    api.patch = () => apiResponse(null, 409);
    const { result } = await renderOffers();

    await act(async () => {
      await expect(result.current.acceptOffer('L1', 'o1')).rejects.toThrow();
    });
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Failed to Accept Offer', variant: 'error' })]);
  });

  it('rejects optimistically and restores the offer on failure', async () => {
    api.incoming = () => apiResponse({ data: [incomingListing([websiteOffer('o1'), websiteOffer('o2')])] });
    api.patch = () => apiResponse(null, 500);
    const { result } = await renderOffers();

    await act(async () => {
      await expect(result.current.rejectOffer('o1')).rejects.toThrow();
    });

    expect(patchCalls()).toEqual([['offer/o1', { rejected: true }]]);
    expect(result.current.incomingOffers.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Failed to Reject Offer' })]);
  });

  it('removes a rejected offer and names the buyer', async () => {
    let listing = incomingListing([websiteOffer('o1'), websiteOffer('o2')]);
    api.incoming = () => apiResponse({ data: [listing] });
    const { result } = await renderOffers();
    listing = incomingListing([websiteOffer('o1', { rejected: true }), websiteOffer('o2')]);

    await act(() => result.current.rejectOffer('o1'));

    expect(result.current.incomingOffers.map((o) => o.id)).toEqual(['o2']);
    expect(toasts()).toEqual([
      { title: 'Offer Rejected', description: "You rejected buyer-o1's offer on Shako", variant: 'success' },
    ]);
  });

  it("unaccepts the listing's accepted offer", async () => {
    api.incoming = () =>
      apiResponse({ data: [incomingListing([websiteOffer('o1'), websiteOffer('o2')], { accepted_offer_id: 'o2' })] });
    const { result } = await renderOffers();

    await act(() => result.current.unacceptOffer('L1'));

    expect(patchCalls()).toEqual([['listing/L1', { accepted_offer_id: null }]]);
    expect(toasts()).toEqual([
      { title: 'Offer Unaccepted', description: "You unaccepted buyer-o2's offer on Shako", variant: 'success' },
    ]);
  });

  it('rethrows when unaccepting fails', async () => {
    api.patch = () => apiResponse(null, 500);
    const { result } = await renderOffers();

    await act(async () => {
      await expect(result.current.unacceptOffer('L1')).rejects.toThrow();
    });
    expect(toasts()).toEqual([expect.objectContaining({ title: 'Failed to Unaccept Offer' })]);
  });

  it('does nothing without a token', async () => {
    const { result } = await renderOffers({ settings: {} as ISettings });

    await act(async () => {
      await result.current.revokeOffer('a');
      await result.current.acceptOffer('L1', 'o1');
      await result.current.rejectOffer('o1');
      await result.current.unacceptOffer('L1');
    });

    expect(tauriFetch).not.toHaveBeenCalled();
    expect(toasts()).toEqual([]);
  });
});
