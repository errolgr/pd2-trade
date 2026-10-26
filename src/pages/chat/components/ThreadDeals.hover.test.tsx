// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { ItemsProvider } from '@/hooks/useItems';
import { useOptions } from '@/hooks/useOptions';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { type ChatListingState, useChatListings } from '../hooks/useChatListings';
import { type ListingMarketPrice, useListingMarketPrices } from '../hooks/useListingMarketPrices';
import { ThreadDeals } from './ThreadDeals';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ confirmToast: vi.fn(), showToast: vi.fn() }));
vi.mock('../hooks/useChatListings', () => ({ useChatListings: vi.fn() }));
vi.mock('../hooks/useListingMarketPrices', () => ({ useListingMarketPrices: vi.fn() }));

const NOW = Date.parse('2026-10-05T00:03:00Z');

const offer = (over: Partial<TradeOffer> = {}): TradeOffer => ({
  id: 'o1',
  isIncoming: true,
  playerName: 'bob',
  itemName: 'Harlequin Crest',
  price: '2 ist',
  hrOffer: 1.5,
  timestamp: new Date('2026-10-05T00:00:00Z'),
  listingId: 'l1',
  ...over,
});

const shako = {
  _id: 'l1',
  hr_price: 2,
  price: '2 ist obo',
  bumped_at: '2026-10-04T00:00:00Z',
  is_ladder: true,
  is_hardcore: false,
  user: { username: 'me' },
  item: {
    name: 'Harlequin Crest',
    quality: { id: 7, name: 'Unique' },
    base: { name: 'Shako' },
    modifiers: [],
    socket_count: 0,
    item_level: 80,
    requirements: { level: 62 },
  },
} as unknown as MarketListingEntry;

const actions = {
  acceptOffer: vi.fn(() => Promise.resolve()),
  rejectOffer: vi.fn(() => Promise.resolve()),
  unacceptOffer: vi.fn(() => Promise.resolve()),
  revokeOffer: vi.fn(() => Promise.resolve()),
  deleteOutgoingOffer: vi.fn(),
  restoreOutgoingOffer: vi.fn(),
  deleteMarketListing: vi.fn(() => Promise.resolve()),
  refresh: vi.fn(),
};
const onCounter = vi.fn();

function renderDeals(offers: TradeOffer[], listings: [string, ChatListingState][]) {
  vi.mocked(useChatListings).mockReturnValue(new Map(listings));
  return render(
    <ItemsProvider items={[]}>
      <ThreadDeals
        offers={offers}
        hiddenOffers={[]}
        whisperTrades={[]}
        listingIds={['l1']}
        now={NOW}
        onCounter={onCounter}
        onSendWebsite={vi.fn(async () => true)}
        onWhisper={vi.fn()}
        onDismissTrade={vi.fn()}
      />
    </ItemsProvider>,
  );
}

const itemName = () => within(screen.getByRole('listitem')).getByText('Harlequin Crest');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePd2Website).mockReturnValue(actions as never);
  vi.mocked(useOptions).mockReturnValue({ settings: {} } as never);
  vi.mocked(useListingMarketPrices).mockReturnValue(new Map([['l1', { hr: 1.8, window: '7d' } as ListingMarketPrice]]));
});

afterEach(() => {
  cleanup();
});

describe('ThreadDeals offer hover card', () => {
  it('shows the listed item and the offer when hovering an offer whose listing resolved', async () => {
    renderDeals([offer()], [['l1', { status: 'listed', listing: shako }]]);

    fireEvent.mouseEnter(itemName());
    const section = await screen.findByRole('region', { name: 'Offer' });
    expect(screen.getByText('Shako')).not.toBeNull();
    expect(screen.getByText('Price:').parentElement!.textContent).toBe('Price:2 HR');
    expect(screen.getByText('Market:')).not.toBeNull();
    expect(section.textContent).toBe('Offer from bobopenOffered:2 ist(1.5 HR)Sent:3m ago');
    expect(screen.queryByText(/Click to/)).toBeNull();
  });

  it('says "Your offer" for outgoing offers and skips an HR value the price already states', async () => {
    renderDeals([offer({ isIncoming: false, price: '1.5 HR' })], [['l1', { status: 'listed', listing: shako }]]);

    fireEvent.mouseEnter(itemName());
    const section = await screen.findByRole('region', { name: 'Offer' });
    expect(section.textContent).toBe('Your offeropenOffered:1.5 HRSent:3m ago');
  });

  it.each<[string, [string, ChatListingState][]]>([
    ['loading', [['l1', { status: 'loading' }]]],
    ['missing', [['l1', { status: 'missing' }]]],
    ['failed', []],
  ])('shows no card while the listing is %s', async (_label, listings) => {
    renderDeals([offer()], listings);

    fireEvent.mouseEnter(itemName());
    await act(async () => {});
    expect(screen.queryByRole('region', { name: 'Offer' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps the action buttons working while the card is open', async () => {
    renderDeals([offer()], [['l1', { status: 'listed', listing: shako }]]);

    fireEvent.mouseEnter(itemName());
    await screen.findByRole('region', { name: 'Offer' });

    fireEvent.click(screen.getByRole('button', { name: /^Counter/ }));
    expect(onCounter).toHaveBeenCalledWith('Counter for Harlequin Crest: ');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Decline/ }));
    });
    expect(actions.rejectOffer).toHaveBeenCalledWith('o1');
  });
});
