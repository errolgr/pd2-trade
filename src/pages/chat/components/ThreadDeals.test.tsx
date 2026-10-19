// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { TradeMessageData } from '@/components/trade/TradeMessage';
import { ThreadDeals } from './ThreadDeals';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));

const offer = (over: Partial<TradeMessageData>): TradeMessageData => ({
  id: 'o1',
  isIncoming: true,
  playerName: 'bob',
  message: 'Offer: 2 ist',
  itemName: 'Harlequin Crest',
  price: '2 ist',
  timestamp: new Date('2026-10-01T00:00:00Z'),
  listingId: 'l1',
  userId: 'bob-id',
  ...over,
});

const actions = {
  acceptOffer: vi.fn(() => Promise.resolve()),
  rejectOffer: vi.fn(() => Promise.resolve()),
  unacceptOffer: vi.fn(() => Promise.resolve()),
  revokeOffer: vi.fn(() => Promise.resolve()),
};

function setOffers(incomingOffers: TradeMessageData[], outgoingOffers: TradeMessageData[] = []) {
  vi.mocked(usePd2Website).mockReturnValue({ incomingOffers, outgoingOffers, ...actions } as never);
}

const onCounter = vi.fn();
const renderDeals = (listingIds: string[] = ['l1'], otherUserId: string | null = 'bob-id') =>
  render(<ThreadDeals otherUserId={otherUserId ?? undefined}
    listingIds={listingIds}
    onCounter={onCounter} />);

const rows = () => screen.queryAllByRole('listitem').filter((li) => !within(li).queryByText(/more$|Show less/));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('ThreadDeals', () => {
  it('renders nothing without offers from the other participant', () => {
    setOffers([offer({ userId: 'carol-id' })], [offer({ id: 'o2', isIncoming: false, userId: 'carol-id' })]);
    const { container } = renderDeals();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing without another participant', () => {
    setOffers([offer({})]);
    const { container } = renderDeals(['l1'], null);
    expect(container.firstChild).toBeNull();
  });

  it("shows this user's offers in both directions, linked listings first, and hides their settled unlinked ones", () => {
    setOffers(
      [
        offer({ id: 'unlinked', listingId: 'l9', itemName: 'Arachnid Mesh', timestamp: new Date('2026-10-05') }),
        offer({ id: 'settled', listingId: 'l8', itemName: 'Mara', acceptedOfferId: 'someone-else' }),
        offer({ id: 'linked', listingId: 'l1', itemName: 'Harlequin Crest', acceptedOfferId: 'linked' }),
      ],
      [offer({ id: 'buying', isIncoming: false, listingId: 'l5', itemName: 'Ber Rune', price: '1 ber' })],
    );
    renderDeals();
    const text = rows().map((row) => row.textContent);
    expect(text).toHaveLength(1);
    expect(text[0]).toContain('Harlequin Crest');
    expect(text[0]).toContain('accepted');

    fireEvent.click(screen.getByRole('button', { name: /2 more/ }));
    const expanded = rows().map((row) => row.textContent ?? '');
    expect(expanded).toHaveLength(3);
    expect(expanded.some((row) => row.includes('Buying from bob') && row.includes('Ber Rune'))).toBe(true);
    expect(expanded.some((row) => row.includes('Selling to bob') && row.includes('Arachnid Mesh'))).toBe(true);
    expect(expanded.some((row) => row.includes('Mara'))).toBe(false);
  });

  it('accepts, counters and declines an open incoming offer with its ids', async () => {
    setOffers([offer({ id: 'o7', listingId: 'l7' })]);
    renderDeals(['l7']);

    fireEvent.click(screen.getByRole('button', { name: /Accept/ }));
    expect(actions.acceptOffer).toHaveBeenCalledWith('l7', 'o7');
    await waitFor(() => expect(screen.getByRole('button', { name: /Decline/ })).toHaveProperty('disabled', false));

    fireEvent.click(screen.getByRole('button', { name: /Decline/ }));
    expect(actions.rejectOffer).toHaveBeenCalledWith('o7');
    await waitFor(() => expect(screen.getByRole('button', { name: /Counter/ })).toHaveProperty('disabled', false));

    fireEvent.click(screen.getByRole('button', { name: /Counter/ }));
    expect(onCounter).toHaveBeenCalledWith('Counter for Harlequin Crest: ');
  });

  it('disables the actions while a request runs and recovers when it fails', async () => {
    let fail!: (error: Error) => void;
    actions.rejectOffer.mockImplementationOnce(() => new Promise<void>((_, reject) => (fail = reject)));
    setOffers([offer({})]);
    renderDeals();

    fireEvent.click(screen.getByRole('button', { name: /Decline/ }));
    expect(screen.getByRole('button', { name: /Accept/ })).toHaveProperty('disabled', true);
    fail(new Error('nope'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Accept/ })).toHaveProperty('disabled', false));
  });

  it('unaccepts an accepted incoming offer by its listing', () => {
    setOffers([offer({ id: 'o3', listingId: 'l3', acceptedOfferId: 'o3' })]);
    renderDeals(['l3']);
    expect(screen.queryByRole('button', { name: /Accept$/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Unaccept/ }));
    expect(actions.unacceptOffer).toHaveBeenCalledWith('l3');
  });

  it('revokes an open outgoing offer', () => {
    setOffers([], [offer({ id: 'o4', isIncoming: false, listingId: 'l4' })]);
    renderDeals(['l4']);
    expect(screen.queryByRole('button', { name: /Accept|Decline|Counter/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Revoke/ }));
    expect(actions.revokeOffer).toHaveBeenCalledWith('o4');
  });
});
