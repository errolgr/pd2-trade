import { describe, expect, it } from 'vitest';
import { ToastActionType } from '@/common/types/Events';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { wtbContactBody } from '../alerts/wtb-api';
import { isWtbResponse, wtbBackWhisperText, type WtbResponse } from '../lib/wtb';
import {
  markFilledPatch,
  responseMetLine,
  responseNotice,
  responseSummary,
  selectionContactItem,
  sortResponses,
  wtbResponseToast,
} from './wtb-responses';

const wtbResponse = (over: Partial<WtbResponse> = {}): WtbResponse => ({
  id: 'resp1',
  requestId: 'req1',
  request: {
    id: 'req1',
    title: 'Rare Circlet',
    offer: { amount: 2, currency: 'HR', hr: 2 },
    status: 'open',
    buyer: { userId: 'buyer', name: 'Errol' },
    whisperTo: 'ErrolAcc',
  },
  seller: { userId: 'seller', name: 'HammerTime', account: 'HammerAcc' },
  item: { name: 'Grim Visage', quality: 'Rare', baseCode: 'ci0' },
  met: [
    { id: 'fcr', label: '+20 Faster Cast Rate', value: 20, met: true },
    { id: 'life', label: '+30 to Life', value: null, met: false },
  ],
  channel: 'whisper',
  createdAt: '2026-11-16T10:00:00Z',
  dismissed: false,
  ...over,
});

describe('contact body per source', () => {
  it('sends the channel, the selected account and the item the source has', () => {
    const stash = { hash: 'h1', name: 'Grim Visage' } as unknown as GameStashItem;
    // Price check chip: the clipboard item
    expect(wtbContactBody('message', { text: '{"name":"x"}' }, 'MyAcc')).toEqual({
      channel: 'message',
      account: 'MyAcc',
      text: '{"name":"x"}',
    });
    // List item chip / Fits my stash: the stash item
    expect(wtbContactBody('copy', { item: stash }, 'MyAcc')).toEqual({
      channel: 'copy',
      account: 'MyAcc',
      item: stash,
    });
    // A board card without a matching item, signed out of an account: the channel alone
    expect(wtbContactBody('message', null, null)).toEqual({ channel: 'message' });
  });

  it("a drawer's item: the fitting stash item, the listing it came from, else the price-checked item", () => {
    const stash = { hash: 'h1' } as unknown as GameStashItem;
    const listing = { name: 'Shako' };
    expect(selectionContactItem({ stashItem: stash, listingItem: listing, itemText: 'x' })).toEqual({ item: stash });
    expect(selectionContactItem({ listingItem: listing, itemText: 'x' })).toEqual({ item: listing });
    expect(selectionContactItem({ itemText: 'x' })).toEqual({ text: 'x' });
    expect(selectionContactItem({})).toBeNull();
  });
});

describe('notification for a wtb.response event', () => {
  it('names the seller, the request, the offer, the item and the rows it meets', () => {
    const notice = responseNotice(wtbResponse());
    expect(notice).toEqual({
      title: '🛒 A seller can fill your buy request',
      body: 'HammerTime has a match for Rare Circlet · your offer 2 HR',
      itemName: 'Grim Visage',
      metLine: '✓ +20 Faster Cast Rate (20)',
      note: '',
    });
    expect(responseNotice(wtbResponse({ item: null })).body).toBe('HammerTime whispered you about Rare Circlet');
  });

  it('toast (and log entry): View request on the request, Message back, the item art', () => {
    const toast = wtbResponseToast(wtbResponse(), 8000);
    expect(toast).toMatchObject({
      title: '🛒 A seller can fill your buy request',
      description:
        'HammerTime has a match for Rare Circlet · your offer 2 HR\nGrim Visage\n✓ +20 Faster Cast Rate (20)',
      duration: 8000,
      action: { label: 'View request', type: ToastActionType.OPEN_MARKET_PANEL, data: { requestId: 'req1' } },
      secondaryAction: { label: 'Message back', type: ToastActionType.WTB_WHISPER_BACK },
      art: { itemName: 'Grim Visage', baseCode: 'ci0' },
    });
    expect(wtbResponseToast(wtbResponse({ item: null }), 8000)).not.toHaveProperty('art');
  });

  it('Message back asks the seller about the item', () => {
    expect(wtbBackWhisperText(wtbResponse())).toBe('Hi! About my Rare Circlet request — still have the Grim Visage?');
    expect(wtbBackWhisperText(wtbResponse({ item: null }))).toBe('Hi! About my Rare Circlet request — still have one?');
  });

  it('skips malformed events', () => {
    expect(isWtbResponse(wtbResponse())).toBe(true);
    expect(isWtbResponse({ id: 'x' })).toBe(false);
    expect(isWtbResponse(null)).toBe(false);
  });
});

describe('Responses list', () => {
  it('those with an item first, newest first within each; dismissed ones left out', () => {
    const list = sortResponses([
      wtbResponse({ id: 'old-item', createdAt: '2026-11-16T08:00:00Z' }),
      wtbResponse({ id: 'new-plain', item: null, createdAt: '2026-11-16T12:00:00Z' }),
      wtbResponse({ id: 'new-item', createdAt: '2026-11-16T11:00:00Z' }),
      wtbResponse({ id: 'gone', dismissed: true, createdAt: '2026-11-16T13:00:00Z' }),
      wtbResponse({ id: 'old-plain', item: null, createdAt: '2026-11-16T07:00:00Z' }),
    ]);
    expect(list.map((r) => r.id)).toEqual(['new-item', 'old-item', 'new-plain', 'old-plain']);
  });

  it('pending offers to sell come first', () => {
    const list = sortResponses([
      wtbResponse({ id: 'contact', createdAt: '2026-11-16T12:00:00Z' }),
      wtbResponse({ id: 'decided', kind: 'offer', price: { amount: 2, currency: 'HR', hr: 2 }, status: 'declined' }),
      wtbResponse({
        id: 'pending',
        kind: 'offer',
        price: { amount: 2, currency: 'HR', hr: 2 },
        status: 'pending',
        createdAt: '2026-11-16T08:00:00Z',
      }),
    ]);
    expect(list.map((r) => r.id)).toEqual(['pending', 'contact', 'decided']);
  });

  it("an offer's notification: who sells for how much, the request, the met rows and the note", () => {
    const notice = responseNotice(
      wtbResponse({
        kind: 'offer',
        price: { amount: 1, currency: 'Ber', hr: 3 },
        status: 'pending',
        note: 'fast trade',
      }),
    );
    expect(notice).toEqual({
      title: '🏷 HammerTime asks 1 Ber for Grim Visage',
      body: 'For your Rare Circlet request (you offered 2 HR)',
      itemName: null,
      metLine: '✓ +20 Faster Cast Rate (20)',
      note: '“fast trade”',
    });
  });

  it("row summary: an offer's price phrase or how they reached you, then the item when sent", () => {
    const price = { amount: 2, currency: 'HR' as const, hr: 2 };
    expect(responseSummary(wtbResponse({ kind: 'offer', price, status: 'pending' }))).toBe(
      'will sell at your price · Grim Visage',
    );
    expect(
      responseSummary(wtbResponse({ kind: 'offer', price: { amount: 1, currency: 'Ber', hr: 3 }, item: null })),
    ).toBe('asks 1 Ber');
    expect(responseSummary(wtbResponse({ channel: 'message' }))).toBe('messaged you · Grim Visage');
    expect(responseSummary(wtbResponse({ channel: 'copy', item: null }))).toBe('whispered you');
    expect(responseSummary(wtbResponse({ channel: 'whisper', item: null }))).toBe('whispered you');
  });

  it('met line: the met rows with their values', () => {
    expect(responseMetLine(wtbResponse({ met: [] }))).toBe('');
    expect(
      responseMetLine(
        wtbResponse({
          met: [
            { id: 'a', label: '+1 to All Skills', value: null, met: true },
            { id: 'b', label: '+20 Faster Cast Rate', value: 20, met: true },
          ],
        }),
      ),
    ).toBe('✓ +1 to All Skills · ✓ +20 Faster Cast Rate (20)');
  });

  it('Mark filled closes the request with the response that filled it', () => {
    expect(markFilledPatch(wtbResponse())).toEqual({ status: 'closed', filledByResponseId: 'resp1' });
  });
});
