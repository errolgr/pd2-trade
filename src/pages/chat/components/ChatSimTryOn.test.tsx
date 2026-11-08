// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { ItemsProvider } from '@/hooks/useItems';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import { getSimLadderCharacters } from '@/lib/sim-characters';
import type { SimAccess } from '@/lib/sim-export-api';
import { fetchMultipleItemPrices } from '@/pages/currency/lib/price-api';
import type { ChatListingState } from '../hooks/useChatListings';
import { ChatSimTryOnProvider } from './ChatSimTryOn';
import { LinkedMessageContent, MessageContent } from './MessageContent';

vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://pd2trader.test' }));
vi.mock('@/lib/telemetry', () => ({ trackMeasurement: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSimAccess', () => ({ useSimAccess: vi.fn() }));
vi.mock('@/lib/sim-characters', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSimLadderCharacters: vi.fn(),
}));
vi.mock('@/overlay', () => ({ showToast: vi.fn() }));
vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn() }));
vi.mock('../hooks/useChatListings', () => ({ useChatListings: () => new Map() }));

const ID = '6a0bf54e6c42aba37528aeb6';
const URL = `https://projectdiablo2.com/market/listing/${ID}?display="Harlequin Crest"`;
const IN: SimAccess = { canUse: true, waitlistUrl: 'https://pd2trader.test/sim/beta', waitlistPosition: null };
const LISTING = {
  _id: ID,
  hr_price: 2,
  bumped_at: '2026-11-07T05:29:49.989Z',
  is_ladder: true,
  is_hardcore: false,
  user: { username: 'seller' },
  item: {
    name: 'Harlequin Crest',
    quality: { id: 7, name: 'Unique' },
    base: { name: 'Shako' },
    modifiers: [],
    socket_count: 0,
    item_level: 90,
    location: { storage: 'Shared Stash', stash_page: 1 },
    requirements: { level: 62 },
  },
} as unknown as MarketListingEntry;

let settings: Partial<ISettings>;

function renderMessage(content: string, state?: ChatListingState, provider = true) {
  const listings = new Map<string, ChatListingState>(state ? [[ID, state]] : []);
  const message = <MessageContent content={content}
    listings={listings} />;
  return render(
    <ItemsProvider items={[]}>
      {provider ? <ChatSimTryOnProvider>{message}</ChatSimTryOnProvider> : message}
    </ItemsProvider>,
  );
}
const tryOnButton = () => screen.queryByRole('button', { name: /^Try on/ });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  settings = { pd2Token: 'tok', account: 'Main', simCharacter: 'HammerPal', simGoal: 'quick_sim' };
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as ReturnType<typeof useOptions>);
  vi.mocked(useSimAccess).mockReturnValue(IN);
  vi.mocked(openUrl).mockResolvedValue();
  vi.mocked(fetchMultipleItemPrices).mockResolvedValue(new Map());
});
afterEach(cleanup);

describe('chat Try on', () => {
  it('opens a live listing on the default character in the planner', async () => {
    renderMessage(`Hi, I'm interested in your ${URL}`, { status: 'listed', listing: LISTING });
    const button = tryOnButton()!;
    expect(button.getAttribute('title')).toBe('Try on HammerPal in the Horadric Sim planner');
    await act(async () => fireEvent.click(button));
    expect(openUrl).toHaveBeenCalledWith(`https://pd2trader.test/sim/plan?listing=${ID}&import=HammerPal`);
  });

  it('passes the default goal and falls back to the first ladder character', async () => {
    settings = { pd2Token: 'tok', account: 'Main', simGoal: 'top_gear' };
    vi.mocked(getSimLadderCharacters).mockResolvedValue([{ name: 'Sorc', account: 'Main', level: 95 }]);
    renderMessage(URL, { status: 'listed', listing: LISTING });
    await act(async () => fireEvent.click(tryOnButton()!));
    expect(openUrl).toHaveBeenCalledWith(`https://pd2trader.test/sim/plan?listing=${ID}&import=Sorc&goal=top_gear`);
  });

  it('appears only on lines whose listing resolved to a live listing', () => {
    renderMessage('wtb shako, pm me');
    expect(tryOnButton()).toBeNull();
    cleanup();
    for (const state of [undefined, { status: 'loading' }, { status: 'missing' }] as const) {
      renderMessage(URL, state);
      expect(tryOnButton()).toBeNull();
      cleanup();
    }
    renderMessage(URL, { status: 'unlisted', listing: LISTING });
    expect(tryOnButton()).toBeNull();
  });

  it('stays off outside the chat panel, outside the beta and signed out', () => {
    renderMessage(URL, { status: 'listed', listing: LISTING }, false);
    expect(tryOnButton()).toBeNull();
    cleanup();
    render(
      <ItemsProvider items={[]}>
        <LinkedMessageContent content={URL} />
      </ItemsProvider>,
    );
    expect(tryOnButton()).toBeNull();
    cleanup();

    vi.mocked(useSimAccess).mockReturnValue({ ...IN, canUse: false });
    renderMessage(URL, { status: 'listed', listing: LISTING });
    expect(tryOnButton()).toBeNull();
    cleanup();

    vi.mocked(useSimAccess).mockReturnValue(IN);
    settings = { simCharacter: 'HammerPal' };
    renderMessage(URL, { status: 'listed', listing: LISTING });
    expect(tryOnButton()).toBeNull();
  });
});
