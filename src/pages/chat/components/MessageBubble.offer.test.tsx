// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { ItemsProvider } from '@/hooks/useItems';
import type { TradeOffer } from '@/hooks/useTradeOffers';
import { type ChatListingState, useChatListings } from '../hooks/useChatListings';
import { type ListingMarketPrice, useListingMarketPrices } from '../hooks/useListingMarketPrices';
import type { TimelineEntry } from '../lib/inbox';
import { buildRows, MessageBubble } from './MessageBubble';

vi.mock('../hooks/useChatListings', () => ({ useChatListings: vi.fn() }));
vi.mock('../hooks/useListingMarketPrices', () => ({ useListingMarketPrices: vi.fn() }));

const offer: TradeOffer = {
  id: 'o1',
  isIncoming: false,
  playerName: 'seller',
  itemName: 'Gravepalm',
  price: '5 wss',
  timestamp: new Date('2026-10-05T00:00:00Z'),
  listingId: 'l1',
  acceptedOfferId: 'o1',
};

const gravepalm = {
  _id: 'l1',
  hr_price: 0.5,
  price: '',
  bumped_at: '2026-10-04T00:00:00Z',
  is_ladder: true,
  is_hardcore: false,
  user: { username: 'seller' },
  item: {
    name: 'Gravepalm',
    quality: { id: 7, name: 'Unique' },
    base: { name: 'Sharkskin Gloves' },
    modifiers: [],
    socket_count: 0,
    item_level: 70,
    requirements: { level: 32 },
  },
} as unknown as MarketListingEntry;

function renderPill(listings: [string, ChatListingState][]) {
  vi.mocked(useChatListings).mockReturnValue(new Map(listings));
  const entry: TimelineEntry = {
    key: 'offer:o1',
    source: 'website',
    own: true,
    content: '',
    createdAt: offer.timestamp.toISOString(),
    unread: false,
    offer,
  };
  render(
    <ItemsProvider items={[]}>
      <MessageBubble
        row={buildRows([entry])[0]}
        otherName="seller"
        onOpenTrader={() => {}}
        listings={new Map()}
        onRetry={() => {}}
      />
    </ItemsProvider>,
  );
  return screen.getByText(/Your offer/).parentElement!;
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.mocked(useListingMarketPrices).mockReturnValue(new Map([['l1', { hr: 0.4, window: '7d' } as ListingMarketPrice]]));
});

afterEach(() => {
  cleanup();
});

describe('MessageBubble offer pill hover card', () => {
  it('shows the listed item and the accepted offer, and drops the native title', async () => {
    const pill = renderPill([['l1', { status: 'listed', listing: gravepalm }]]);
    expect(pill.getAttribute('title')).toBeNull();

    fireEvent.mouseEnter(pill);
    const section = await screen.findByRole('region', { name: 'Offer' });
    expect(screen.getByText('Sharkskin Gloves')).not.toBeNull();
    expect(screen.getByText('Price:').parentElement!.textContent).toBe('Price:0.5 HR');
    expect(section.textContent).toMatch(/^Your offeracceptedOffered:5 wssSent:/);
  });

  it('shows the offer-only card when the listing is missing', async () => {
    const pill = renderPill([['l1', { status: 'missing' }]]);

    fireEvent.mouseEnter(pill);
    const section = await screen.findByRole('region', { name: 'Offer' });
    const card = section.parentElement!;
    expect(within(card).getByText('Gravepalm')).not.toBeNull();
    expect(within(card).getByText('Listing no longer available')).not.toBeNull();
    expect(within(card).queryByText('Price:')).toBeNull();
    expect(section.textContent).toMatch(/^Your offeracceptedOffered:5 wssSent:/);
  });
});
