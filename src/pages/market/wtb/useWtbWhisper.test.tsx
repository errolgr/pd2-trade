// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeText } from '@/lib/browser-clipboard';
import { useOverlay } from '@/overlay';
import { contactWtbRequest } from '../alerts/wtb-api';
import type * as WtbApi from '../alerts/wtb-api';
import { defaultFilters } from '../lib/defaults';
import type { WtbRequest, WtbResponse } from '../lib/wtb';
import { useWtbWhisper } from './useWtbWhisper';

vi.mock('@/overlay', () => ({ useOverlay: vi.fn(), showToast: vi.fn() }));
vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn() }));
vi.mock('@/hooks/useWhisperHistory', () => ({ useWhisperHistory: () => ({ recordCopied: vi.fn() }) }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: () => ({ settings: { pd2Token: 'tok', account: 'MyAcc' } }) }));
vi.mock('../alerts/wtb-api', async (importOriginal) => ({
  ...(await importOriginal<typeof WtbApi>()),
  contactWtbRequest: vi.fn(),
}));

const openPanel = vi.fn();

const request: WtbRequest = {
  id: 'req1',
  buyer: { userId: 'buyer-id', name: 'Errol' },
  whisperTo: 'ErrolAcc',
  title: 'Rare Circlet',
  filters: defaultFilters({ hardcore: false, ladder: true }),
  niceToHaveIds: [],
  offer: { amount: 2, currency: 'HR', hr: 2 },
  openToOffers: true,
  status: 'open',
  createdAt: '2026-11-16T10:00:00Z',
  bumpedAt: '2026-11-16T10:00:00Z',
  updatedAt: '2026-11-16T10:00:00Z',
  expiresAt: '2026-11-23T10:00:00Z',
  expiryDays: 7,
};

const response = {
  id: 'resp1',
  requestId: 'req1',
  request: {
    id: 'req1',
    title: 'Rare Circlet',
    offer: request.offer,
    status: 'open',
    buyer: request.buyer,
    whisperTo: 'ErrolAcc',
  },
  seller: { userId: 'seller-id', name: 'HammerTime', account: 'HammerAcc' },
  item: { name: 'Grim Visage', quality: 'Rare', baseCode: 'ci0' },
  met: [],
  channel: 'message',
  createdAt: '2026-11-16T10:00:00Z',
  dismissed: false,
} as WtbResponse;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as never);
  vi.mocked(contactWtbRequest).mockResolvedValue(undefined as never);
  vi.mocked(writeText).mockResolvedValue(undefined);
});

describe('useWtbWhisper', () => {
  it('Message opens the website chat with the buyer, draft filled in, the contact left to the first send', async () => {
    const { result } = renderHook(() => useWtbWhisper('priceCheck'));
    await act(() => result.current.whisper(request, { text: '{"name":"x"}' }));
    expect(openPanel).toHaveBeenCalledWith(
      'chat',
      {
        userId: 'buyer-id',
        userName: 'Errol',
        draft: 'Hi! I have the Rare Circlet you want for 2 HR (pd2trader)',
        reply: true,
        wtbContact: { requestId: 'req1', item: { text: '{"name":"x"}' } },
      },
      { focus: true },
    );
    expect(writeText).not.toHaveBeenCalled();
    // Clicking Message records nothing: the chat does, once a message actually goes to the buyer
    expect(contactWtbRequest).not.toHaveBeenCalled();

    // From a board card without a matching item: the pending contact has no item
    await act(() => result.current.whisper(request));
    expect(openPanel.mock.calls.at(-1)?.[1]).toMatchObject({ wtbContact: { requestId: 'req1' } });
    expect(openPanel.mock.calls.at(-1)?.[1].wtbContact).not.toHaveProperty('item');
    expect(contactWtbRequest).not.toHaveBeenCalled();
  });

  it('Copy whisper still puts the /w line on the clipboard for the game chat', async () => {
    const { result } = renderHook(() => useWtbWhisper('market'));
    await act(() => result.current.copyWhisper(request));
    expect(writeText).toHaveBeenCalledWith('/w *ErrolAcc Hi! I have the Rare Circlet you want for 2 HR (pd2trader)');
    expect(openPanel).not.toHaveBeenCalled();
    expect(contactWtbRequest).toHaveBeenCalledWith('req1', { channel: 'copy', account: 'MyAcc' }, 'tok');
  });

  it('Message back opens the website chat with the seller', async () => {
    const { result } = renderHook(() => useWtbWhisper('alert'));
    await act(() => result.current.whisperBack(response));
    expect(openPanel).toHaveBeenCalledWith(
      'chat',
      expect.objectContaining({
        userId: 'seller-id',
        userName: 'HammerTime',
        draft: 'Hi! About my Rare Circlet request — still have the Grim Visage?',
      }),
      { focus: true },
    );
    expect(writeText).not.toHaveBeenCalled();
    // Never a contact, and no pending one for the chat either
    expect(openPanel.mock.calls[0][1]).not.toHaveProperty('wtbContact');
    expect(contactWtbRequest).not.toHaveBeenCalled();
  });

  it("the chat card's Message (a request you answered) opens the buyer's chat without a contact", async () => {
    const { result } = renderHook(() => useWtbWhisper('chat'));
    await act(() => result.current.whisperBuyer(response));
    expect(openPanel).toHaveBeenCalledWith('chat', expect.objectContaining({ userId: 'buyer-id' }), { focus: true });
    expect(openPanel.mock.calls[0][1]).not.toHaveProperty('wtbContact');
    expect(contactWtbRequest).not.toHaveBeenCalled();
  });
});
