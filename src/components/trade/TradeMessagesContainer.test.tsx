// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { useTradeMessages } from '@/hooks/useTradeMessages';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import type { TradeMessageData } from './TradeMessage';
import { TradeMessagesContainer } from './TradeMessagesContainer';

vi.mock('@/hooks/useTradeMessages', () => ({ useTradeMessages: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
const hide = vi.fn();
vi.mock('@/lib/browser-webview', () => ({ getCurrentWebviewWindow: () => ({ hide }) }));
// Stub the row so these tests cover list composition and handler wiring, not row internals.
vi.mock('./TradeMessage', () => ({
  TradeMessage: (props: {
    trade: TradeMessageData;
    isHidden?: boolean;
    onDelete?: (listingId: string) => Promise<void>;
    onRestoreOutgoing?: (id: string) => void;
  }) => (
    <div data-testid="trade"
      data-id={props.trade.id}
      data-hidden={String(Boolean(props.isHidden))}>
      {props.onDelete && <button onClick={() => props.onDelete!(props.trade.listingId!)}>delete {props.trade.id}</button>}
      {props.onRestoreOutgoing && <span>restorable</span>}
    </div>
  ),
}));

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

let trades: TradeMessageData[];
let site: {
  incomingOffers: TradeMessageData[];
  outgoingOffers: TradeMessageData[];
  hiddenOutgoingOffers: TradeMessageData[];
  deleteMarketListing: Mock<(listingId: string) => Promise<void>>;
  refresh: Mock<() => void>;
  [key: string]: unknown;
};

function trade(id: string, minutesAgo: number, isIncoming: boolean, extra: Partial<TradeMessageData> = {}): TradeMessageData {
  return {
    id,
    isIncoming,
    playerName: id,
    message: '',
    timestamp: new Date(Date.UTC(2026, 0, 1, 12, 0) - minutesAgo * 60_000),
    ...extra,
  };
}

const rowIds = () => screen.queryAllByTestId('trade').map((el) => el.getAttribute('data-id'));
const tab = (name: RegExp) => screen.getByRole('tab', { name });

async function selectTab(name: RegExp) {
  await act(async () => {
    fireEvent.mouseDown(tab(name));
  });
}

beforeEach(() => {
  trades = [];
  site = {
    incomingOffers: [],
    outgoingOffers: [],
    hiddenOutgoingOffers: [],
    revokeOffer: vi.fn(),
    acceptOffer: vi.fn(),
    rejectOffer: vi.fn(),
    unacceptOffer: vi.fn(),
    deleteOutgoingOffer: vi.fn(),
    restoreOutgoingOffer: vi.fn(),
    deleteMarketListing: vi.fn(async () => {}),
    refresh: vi.fn(),
  };
  vi.mocked(useTradeMessages).mockImplementation(
    () => ({ trades, removeTrade: vi.fn() }) as unknown as ReturnType<typeof useTradeMessages>,
  );
  vi.mocked(usePd2Website).mockImplementation(() => site as unknown as ReturnType<typeof usePd2Website>);
});

afterEach(cleanup);

describe('TradeMessagesContainer', () => {
  it('splits whispers by direction, newest first, with counts on the tabs', async () => {
    trades = [trade('in-old', 30, true), trade('out', 5, false), trade('in-new', 1, true)];
    site.incomingOffers = [trade('web', 1, true)];
    render(<TradeMessagesContainer />);

    expect(tab(/Whispers/).textContent).toContain('3');
    expect(tab(/Website/).textContent).toContain('1');
    expect(tab(/Incoming/).textContent).toContain('2');
    expect(tab(/Outgoing/).textContent).toContain('1');
    expect(rowIds()).toEqual(['in-new', 'in-old']);

    await selectTab(/Outgoing/);
    expect(rowIds()).toEqual(['out']);
  });

  it('shows empty states when there are no whispers', async () => {
    render(<TradeMessagesContainer />);
    expect(screen.queryByText('No incoming whispers')).not.toBeNull();
    await selectTab(/Outgoing/);
    expect(screen.queryByText('No outgoing whispers')).not.toBeNull();
  });

  it('lists website offers newest first and refreshes after deleting a listing', async () => {
    site.incomingOffers = [trade('a', 10, true, { listingId: 'LA' }), trade('b', 2, true, { listingId: 'LB' })];
    const order: string[] = [];
    site.deleteMarketListing.mockImplementation(async (id: string) => {
      order.push(`delete ${id}`);
    });
    site.refresh.mockImplementation(() => order.push('refresh'));
    render(<TradeMessagesContainer />);

    await selectTab(/Website/);
    expect(rowIds()).toEqual(['b', 'a']);

    await act(async () => {
      fireEvent.click(screen.getByText('delete a'));
    });
    expect(order).toEqual(['delete LA', 'refresh']);
  });

  it('hides hidden outgoing offers until toggled, then lists them after visible ones', async () => {
    site.outgoingOffers = [trade('visible', 1, false, { listingId: 'L1' })];
    site.hiddenOutgoingOffers = [trade('hidden', 0, false, { listingId: 'L2' })];
    render(<TradeMessagesContainer />);
    await selectTab(/Website/);
    await selectTab(/Outgoing/);

    expect(rowIds()).toEqual(['visible']);
    const toggle = screen.getByRole('button', { name: /Show Hidden Offers \(1\)/ });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      fireEvent.click(toggle);
    });
    expect(rowIds()).toEqual(['visible', 'hidden']);
    const hiddenRow = screen.getAllByTestId('trade')[1];
    expect(hiddenRow.getAttribute('data-hidden')).toBe('true');
    expect(hiddenRow.textContent).toContain('restorable');
    expect(screen.getAllByTestId('trade')[0].textContent).not.toContain('restorable');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Hide Hidden Offers \(1\)/ }));
    });
    expect(rowIds()).toEqual(['visible']);
  });

  it('mentions hidden offers in the empty state while they are not shown', async () => {
    site.hiddenOutgoingOffers = [trade('h1', 1, false, { listingId: 'L1' }), trade('h2', 2, false, { listingId: 'L2' })];
    render(<TradeMessagesContainer />);
    await selectTab(/Website/);
    await selectTab(/Outgoing/);

    expect(screen.queryByText('2 hidden offer(s) not shown.')).not.toBeNull();
    // Hidden offers do not count toward the website tab total
    expect(tab(/Website/).textContent).toContain('0');
  });

  it('hides the offers window from the close button', async () => {
    render(<TradeMessagesContainer />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Hide offers' }));
    });
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
