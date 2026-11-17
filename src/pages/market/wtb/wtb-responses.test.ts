import { describe, expect, it } from 'vitest';
import { ToastActionType } from '@/common/types/Events';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { wtbContactBody } from '../alerts/wtb-api';
import { isWtbResponse, wtbBackWhisper, type WtbResponse } from '../lib/wtb';
import {
  markFilledPatch,
  responseMetLine,
  responseNotice,
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
    expect(wtbContactBody('whisper', { text: '{"name":"x"}' }, 'MyAcc')).toEqual({
      channel: 'whisper',
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
    expect(wtbContactBody('whisper', null, null)).toEqual({ channel: 'whisper' });
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
    });
    expect(responseNotice(wtbResponse({ item: null })).body).toBe('HammerTime whispered you about Rare Circlet');
  });

  it('toast (and log entry): View request on the request, Whisper back, the item art', () => {
    const toast = wtbResponseToast(wtbResponse(), 8000);
    expect(toast).toMatchObject({
      title: '🛒 A seller can fill your buy request',
      description:
        'HammerTime has a match for Rare Circlet · your offer 2 HR\nGrim Visage\n✓ +20 Faster Cast Rate (20)',
      duration: 8000,
      action: { label: 'View request', type: ToastActionType.OPEN_MARKET_PANEL, data: { requestId: 'req1' } },
      secondaryAction: { label: 'Whisper back', type: ToastActionType.WTB_WHISPER_BACK },
      art: { itemName: 'Grim Visage', baseCode: 'ci0' },
    });
    expect(wtbResponseToast(wtbResponse({ item: null }), 8000)).not.toHaveProperty('art');
  });

  it('Whisper back asks the seller about the item on their account', () => {
    expect(wtbBackWhisper(wtbResponse())).toBe(
      '/w *HammerAcc Hi! About my Rare Circlet request — still have the Grim Visage?',
    );
    expect(wtbBackWhisper(wtbResponse({ seller: { userId: 's', name: 'Hammer', account: null }, item: null }))).toBe(
      '/w *Hammer Hi! About my Rare Circlet request — still have one?',
    );
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
