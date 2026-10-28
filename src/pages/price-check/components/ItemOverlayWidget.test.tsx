// @vitest-environment happy-dom
import React from 'react';
import { MotionGlobalConfig } from 'framer-motion';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInView } from 'react-intersection-observer';
import { useOptions } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { allItems } from '@/assets/items';
import { openUrl } from '@/lib/browser-opener';
import { writeText } from '@/lib/browser-clipboard';
import {
  fetchCorruptionPrices,
  fetchItemPrice,
  fetchItemPriceByName,
  fetchPriceHistory,
  type AveragePriceResponse,
  type CorruptionPricesResponse,
} from '@/pages/currency/lib/price-api';
import type {
  ItemDetail,
  MarketListingEntry,
  MarketListingResult,
  UserSummary,
} from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { MarketListingQuery } from '@/common/types/pd2-website/GetMarketListingsCommand';
import type { RareAppraisal } from '@/lib/rare-appraisal-api';
import { useRareAppraisal, type RareAppraisalState } from '../hooks/useRareAppraisal';
import type { Item } from '../lib/interfaces';
import { loadBuildUsage } from '../lib/build-usage';
import ItemOverlayWidget from './ItemOverlayWidget';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('../hooks/useRareAppraisal', () => ({ useRareAppraisal: vi.fn() }));
vi.mock('../hooks/useEconomyData', () => ({
  useEconomyData: () => ({
    loading: false,
    calculatedRuneValues: [],
    selectedRuneBreakdown: null,
    selectedRuneCombinations: [],
    setSelectedRuneBreakdown: () => {},
  }),
}));
vi.mock('@/pages/currency/lib/price-api', () => ({
  fetchItemPrice: vi.fn(),
  fetchItemPriceByName: vi.fn(),
  fetchCorruptionPrices: vi.fn(),
  fetchPriceHistory: vi.fn(),
}));
const overlay = vi.hoisted(() => ({ openPanel: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: () => overlay }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/browser-clipboard', () => ({ writeText: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn(), trackMeasurement: vi.fn() }));
vi.mock('react-intersection-observer', () => ({ useInView: vi.fn() }));
// Ladder item usage (builds service): none unless a test sets it
vi.mock('../lib/build-usage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  loadBuildUsage: vi.fn(async () => null),
}));
// Listing hover detail belongs to quick-list; a stub keeps these tests about the price check itself.
vi.mock('../../quick-list/components/ItemStatsDisplay', () => ({
  default: ({ stashItem }: { stashItem: { name?: string } }) => (
    <div data-testid="listing-stats">{stashItem?.name}</div>
  ),
}));

// happy-dom's WAAPI rejects cancelled animations as unhandled errors; finish motion instantly instead.
beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

// ---------------------------------------------------------------- fixtures

const TEST_ITEMS = allItems.filter((i) => i.key === 'Harlequin Crest' || i.key === 'Rainbow Facet');

const FCR = { stat_id: 105, name: '% Faster Cast Rate', value: 20, range: { min: 10, max: 20 } };
const MF = { stat_id: 80, name: '% Better Chance of Getting Magic Items', value: 30, range: { min: 25, max: 35 } };

const rareRing = (overrides: Partial<Item> = {}): Item => ({
  name: 'Doom Coil',
  quality: 'Rare',
  type: 'Ring',
  iLevel: 85,
  stats: [FCR, MF],
  ...overrides,
});

const shako = (overrides: Partial<Item> = {}): Item => ({
  name: 'Harlequin Crest',
  quality: 'Unique',
  type: 'Shako',
  iLevel: 85,
  defense: 141,
  stats: [{ stat_id: 127, name: 'to All Skills', value: 2 }],
  ...overrides,
});

const priceData = (overrides: Partial<AveragePriceResponse> = {}): AveragePriceResponse => ({
  typeCode: 'helm',
  baseCode: 'harlequin_crest',
  itemName: 'Harlequin Crest',
  averagePrice: 4,
  minPrice: 1,
  maxPrice: 9,
  medianPrice: 3,
  movingAverage7Days: 3.5,
  trimmedMean7Days: 3.4,
  lastDayPrice: 3.6,
  sampleCount: 42,
  hourlyVolumeAverage: 1,
  isLadder: true,
  isHardcore: false,
  timeRange: { start: '2026-10-11', end: '2026-10-18' },
  ...overrides,
});

type ListingOverrides = Omit<Partial<MarketListingEntry>, 'item' | 'user'> & {
  item?: Partial<ItemDetail> & { name?: string; corruptions?: string[] };
  user?: Partial<UserSummary> & { in_game_account?: string };
};

let listingSeq = 0;
function listing({ item, user, ...overrides }: ListingOverrides = {}): MarketListingEntry {
  listingSeq += 1;
  return {
    _id: `l${listingSeq}`,
    user_id: 'u',
    type: 'item',
    is_hardcore: false,
    is_ladder: true,
    // Fixture carries only the fields the listing row reads; the full API item has dozens more.
    item: { name: 'Doom Coil', is_ethereal: false, socket_count: 0, corruptions: [], ...item } as unknown as ItemDetail,
    price: '',
    hr_price: 1.5,
    bumped_at: '2026-10-18T10:00:00.000Z',
    created_at: '',
    updated_at: '',
    created_by_id: '',
    updated_by_id: '',
    user: { username: 'seller', ...user } as unknown as UserSummary,
    ...overrides,
  };
}

const page = (data: MarketListingEntry[], total = data.length): MarketListingResult => ({
  data,
  total,
  limit: 20,
  skip: 0,
});

// ---------------------------------------------------------------- mock state

let settings: Record<string, unknown>;
let settingsLoading: boolean;
let rareState: RareAppraisalState;
let inView: boolean;
const getMarketListings = vi.fn<(query: MarketListingQuery) => Promise<MarketListingResult>>();
const getMarketListingsArchive = vi.fn<(query: MarketListingQuery) => Promise<MarketListingResult>>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-18T12:00:00Z'));
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});

  settings = { ladder: 'ladder', mode: 'softcore', priceWindowHours: 168, selectedSeasonId: 'current' };
  settingsLoading = false;
  rareState = { status: 'idle' };
  inView = false;
  getMarketListings.mockReset().mockResolvedValue(page([]));
  getMarketListingsArchive.mockReset().mockResolvedValue(page([]));

  // Hook mocks expose only what the widget reads; the real context values carry many more members.
  vi.mocked(useOptions).mockImplementation(
    () => ({ settings, isLoading: settingsLoading }) as unknown as ReturnType<typeof useOptions>,
  );
  vi.mocked(usePd2Website).mockImplementation(
    () => ({ getMarketListings, getMarketListingsArchive }) as unknown as ReturnType<typeof usePd2Website>,
  );
  vi.mocked(useRareAppraisal).mockImplementation(() => rareState);
  vi.mocked(useInView).mockImplementation(() => ({ ref: () => {}, inView }) as unknown as ReturnType<typeof useInView>);
  vi.mocked(fetchItemPriceByName).mockResolvedValue(null);
  vi.mocked(fetchCorruptionPrices).mockResolvedValue(null);
  vi.mocked(fetchPriceHistory).mockResolvedValue(null);
  vi.mocked(loadBuildUsage).mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderWidget(item: Item, onClose = vi.fn()) {
  const utils = render(
    <ItemsProvider items={TEST_ITEMS}>
      <ItemOverlayWidget item={item}
        onClose={onClose} />
    </ItemsProvider>,
  );
  const rerenderItem = (next: Item) =>
    utils.rerender(
      <ItemsProvider items={TEST_ITEMS}>
        <ItemOverlayWidget item={next}
          onClose={onClose} />
      </ItemsProvider>,
    );
  return { ...utils, onClose, rerenderItem };
}

const statCheckbox = (name: string) =>
  screen.getByText(name).closest('label')!.querySelector('[role="checkbox"]') as HTMLElement;
const searchButton = () => screen.getByRole('button', { name: /^Search$/ });
const lastQuery = (fn = getMarketListings) => fn.mock.calls[fn.mock.calls.length - 1][0];

// ---------------------------------------------------------------- tests

describe('ItemOverlayWidget header', () => {
  it('shows the item name, defense and every parsed stat', () => {
    renderWidget(shako());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Harlequin Crest');
    expect(screen.getByText('Base: Shako')).not.toBeNull();
    expect(screen.getByText('141')).not.toBeNull();
    expect(screen.getByText('+2 to All Skills')).not.toBeNull();
  });

  it('titles a runeword by its runeword name with a badge', () => {
    renderWidget(
      rareRing({ name: 'Monarch', quality: 'Normal', type: 'Monarch', isRuneword: true, runeword: 'Spirit' }),
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toContain('Spirit');
    expect(within(h1).getByText('Runeword')).not.toBeNull();
  });

  it('lets a rare cycle the searched quality through every other base quality and back', async () => {
    renderWidget(rareRing());
    const toggle = screen.getByTitle('Click to cycle quality');
    expect(toggle.textContent).toBe('Rare');
    for (const next of ['Normal', 'Superior', 'Magic', 'Crafted', 'Rare']) {
      fireEvent.click(toggle);
      // the outgoing label animates out, so wait until only the new one remains
      await waitFor(() => expect(screen.getByTitle('Click to cycle quality').textContent).toBe(next));
    }
  });

  it('the cycled quality is what the market search asks for', async () => {
    renderWidget(rareRing());
    fireEvent.click(screen.getByTitle('Click to cycle quality')); // -> Normal
    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalled());
    expect(lastQuery()['item.quality.name']).toBe('Normal');
  });

  it('uniques have no quality/search-mode toggles', () => {
    renderWidget(shako());
    expect(screen.queryByTitle('Click to cycle quality')).toBeNull();
    expect(screen.queryByTitle('Click to toggle search mode')).toBeNull();
  });

  it('Close, Settings and the trade-site button do what they say', async () => {
    const { onClose } = renderWidget(rareRing());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(overlay.openPanel).toHaveBeenCalledWith('settings');

    fireEvent.click(screen.getByRole('button', { name: 'Open search on projectdiablo2.com' }));
    expect(vi.mocked(openUrl).mock.calls[0][0]).toMatch(/^https:\/\/(www\.)?projectdiablo2\.com\//);
  });

  it('shows how many ladder characters wear a unique; clicking opens the builds that wear it', async () => {
    vi.mocked(loadBuildUsage).mockResolvedValue({
      total: 3000,
      items: [
        {
          key: 'unique:harlequin_crest',
          name: 'Harlequin Crest',
          quality: 'Unique',
          iconUrl: null,
          count: 657,
          pct: 21.9,
          priceHr: 1,
        },
      ],
    });
    renderWidget(shako());
    const line = await screen.findByRole('button', { name: /Worn by 21\.9% of level 80\+ ladder characters \(657\)/ });
    fireEvent.click(line);
    expect(overlay.openPanel).toHaveBeenCalledWith('builds', {
      tab: 'meta',
      filters: { items: ['unique:harlequin_crest'], mode: 'softcore' },
    });
  });
});

describe('ItemOverlayWidget unique price pill', () => {
  it('shows a loading state, then the 7-day moving average as the headline price', async () => {
    const { promise, resolve } = Promise.withResolvers<AveragePriceResponse | null>();
    vi.mocked(fetchItemPriceByName).mockReturnValue(promise);
    renderWidget(shako());
    expect(await screen.findByText('Loading price data...')).not.toBeNull();

    await act(async () =>
      resolve(priceData({ priceChange7Days: { change: -0.5, changePercent: -12.5, previousMedianPrice: 4 } })),
    );
    await waitFor(() => expect(screen.getByAltText('Harlequin Crest').parentElement!.textContent).toContain('3.50 HR'));
    const pill = screen.getByAltText('Harlequin Crest').parentElement!;
    expect(pill.textContent).toContain('7-day avg');
    expect(pill.textContent).toContain('-12.5%');
    expect(screen.queryByText('Loading price data...')).toBeNull();

    // asked for the selected mode over the requested window
    expect(fetchItemPriceByName).toHaveBeenCalledWith('Harlequin Crest', {
      isLadder: true,
      isHardcore: false,
      startDate: '2026-04-23',
      hours: 168,
    });
  });

  it('a short window headlines the trimmed mean instead of the moving average', async () => {
    settings.priceWindowHours = 24;
    vi.mocked(fetchItemPriceByName).mockResolvedValue(priceData());
    renderWidget(shako());
    await waitFor(() => expect(screen.getByAltText('Harlequin Crest').parentElement!.textContent).toContain('4.00 HR'));
    expect(screen.getByAltText('Harlequin Crest').parentElement!.textContent).toContain('24-hour avg');
  });

  it('flags a price the server computed over a longer fallback window', async () => {
    vi.mocked(fetchItemPriceByName).mockResolvedValue(priceData({ priceWindow: '30d' }));
    renderWidget(shako());
    const note = await screen.findByLabelText(/Not enough sales this week/);
    expect(note.textContent).toBe('30d');
  });

  it('reports "No price data available" as an error when the API has nothing', async () => {
    renderWidget(shako());
    const msg = await screen.findByText('No price data available');
    expect(msg.className).toContain('text-destructive');
  });

  it('shows the error message when the price request throws', async () => {
    vi.mocked(fetchItemPriceByName).mockRejectedValue(new Error('boom 503'));
    renderWidget(shako());
    expect(await screen.findByText('boom 503')).not.toBeNull();
  });

  it('hover popover breaks the price down and links to pd2trader with the same mode and window', async () => {
    vi.mocked(fetchItemPriceByName).mockResolvedValue(
      priceData({ priceChange7Days: { change: 0.4, changePercent: 10, previousMedianPrice: 3 } }),
    );
    renderWidget(shako());
    const img = await screen.findByAltText('Harlequin Crest');
    fireEvent.mouseEnter(img.parentElement!.parentElement!);
    const popover = await screen.findByRole('dialog');
    expect(within(popover).getByText('Median').parentElement!.textContent).toContain('3.00 HR');
    expect(within(popover).getByText('Min').parentElement!.textContent).toContain('1.00 HR');
    expect(within(popover).getByText('Max').parentElement!.textContent).toContain('9.00 HR');
    expect(within(popover).getByText('Samples:').parentElement!.textContent).toContain('42');
    expect(within(popover).getByText('7d Change:').parentElement!.textContent).toContain('+10.0%');

    fireEvent.click(within(popover).getByRole('button', { name: /Open on pd2trader.com/ }));
    expect(openUrl).toHaveBeenCalledWith(
      'https://pd2trader.com/item/harlequin_crest?isLadder=true&isHardcore=false&hours=168',
    );
  });

  it('lists top corruptions and searches expired corrupted listings with the clicked corruption', async () => {
    vi.mocked(fetchItemPriceByName).mockResolvedValue(priceData());
    const corruptions: CorruptionPricesResponse = {
      typeCode: 'helm',
      baseCode: 'harlequin_crest',
      itemName: 'Harlequin Crest',
      corruptionPrices: Array.from({ length: 7 }, (_, i) => ({
        corruptionKey: [`item_corr_${i}`],
        corruptionName: `Corr ${i}`,
        averagePrice: 2,
        medianPrice: 2 + i,
        sampleCount: 5,
      })),
    };
    vi.mocked(fetchCorruptionPrices).mockResolvedValue(corruptions);
    renderWidget(shako());
    const img = await screen.findByAltText('Harlequin Crest');
    fireEvent.mouseEnter(img.parentElement!.parentElement!);
    const popover = await screen.findByRole('dialog');
    await within(popover).findByText('Top Corruptions');

    // first five, then Show More reveals the rest
    expect(within(popover).queryByText('Corr 5')).toBeNull();
    fireEvent.click(within(popover).getByRole('button', { name: 'Show More (2 more)' }));
    expect(within(popover).getByText('Corr 6')).not.toBeNull();

    fireEvent.click(within(popover).getByText('Corr 2'));
    await waitFor(() => expect(getMarketListingsArchive).toHaveBeenCalled());
    const q = lastQuery(getMarketListingsArchive);
    expect(q['item.corruptions']).toEqual({ $all: ['item_corr_2'] });
    expect(q['item.corrupted']).toBe(true);
    expect(getMarketListings).not.toHaveBeenCalled();
  });

  it('does not ask for unique prices for rares', () => {
    renderWidget(rareRing());
    expect(fetchItemPriceByName).not.toHaveBeenCalled();
    expect(screen.queryByText('No price data available')).toBeNull();
  });
});

describe('ItemOverlayWidget stat selection', () => {
  it('selecting a stat pre-fills a range around its value and shows a clearable count', async () => {
    renderWidget(rareRing());
    expect(screen.queryByText(/selected/)).toBeNull();

    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    // Rings only roll a fixed 10% FCR, so PD2 draws no range and the fill is value ± 5%.
    expect((screen.getByLabelText('% Faster Cast Rate minimum') as HTMLInputElement).value).toBe('19');
    expect((screen.getByLabelText('% Faster Cast Rate maximum') as HTMLInputElement).value).toBe('21');
    expect(screen.getByText('1 selected')).not.toBeNull();

    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() => expect(screen.queryByLabelText('% Faster Cast Rate minimum')).toBeNull());
    expect(statCheckbox('+20% Faster Cast Rate').getAttribute('aria-checked')).toBe('false');
  });

  it('Clear also resets the tri-state corrupted filter', async () => {
    renderWidget(rareRing({ name: 'Doom Visage', type: 'Shako' }));
    const corrupted = screen.getByRole('checkbox', { name: 'Corrupted filter' });
    fireEvent.click(corrupted);
    expect(corrupted.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByRole('checkbox', { name: 'Corrupted filter' }).getAttribute('aria-checked')).toBe('false');
  });

  it('Clear ranges empties every min/max but keeps the stats selected, so the search only needs the stat', async () => {
    renderWidget(rareRing());
    expect(screen.queryByText('Clear ranges')).toBeNull();
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.click(screen.getByText('Clear ranges'));
    expect((screen.getByLabelText('% Faster Cast Rate minimum') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('% Faster Cast Rate maximum') as HTMLInputElement).value).toBe('');
    expect(statCheckbox('+20% Faster Cast Rate').getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByText('Clear ranges')).toBeNull();
    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(lastQuery())).toContain('{"$elemMatch":{"name":"item_fastercastrate"}}');
  });

  it('edited min/max values are what the search filters on', async () => {
    renderWidget(rareRing());
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.change(screen.getByLabelText('% Faster Cast Rate minimum'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('% Faster Cast Rate maximum'), { target: { value: '' } });
    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(lastQuery())).toContain(
      '{"$elemMatch":{"name":"item_fastercastrate","values.0":{"$gte":15}}}',
    );
  });

  it('Enter in a range input runs the search', async () => {
    renderWidget(rareRing());
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.keyDown(screen.getByLabelText('% Faster Cast Rate minimum'), { key: 'Enter' });
    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(1));
  });

  it('a new item clears the previous selection and results', async () => {
    getMarketListings.mockResolvedValue(page([listing()], 1));
    const { rerenderItem } = renderWidget(rareRing());
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.click(searchButton());
    await screen.findByText('1.5 HR');

    rerenderItem(rareRing({ name: 'Storm Loop', stats: [MF] }));
    await waitFor(() => expect(screen.queryByText('1.5 HR')).toBeNull());
    expect(screen.queryByText(/selected/)).toBeNull();
    expect(screen.getByText('Ready to search')).not.toBeNull();
  });

  // #147: BH exports chance-to-cast lines without a stat id or skill. Their rows shared one key, so React lost
  // track of all but one of them and the rest stayed on screen under every later price check.
  it('a new item shows only its own chance-to-cast rows', async () => {
    const ctc = (chance: number, level: number, skill: string, when: string) => ({
      name: `${chance}% Chance to cast level ${level} ${skill} ${when}`,
      chance,
      level,
    });
    const { rerenderItem } = renderWidget(
      rareRing({ stats: [FCR, ctc(15, 20, 'Fire Ball', 'on attack'), ctc(2, 20, 'Fire Wall', 'on attack')] }),
    );
    expect(screen.getByText('15% Chance to cast level 20 Fire Ball on attack')).not.toBeNull();
    expect(screen.getByText('2% Chance to cast level 20 Fire Wall on attack')).not.toBeNull();

    rerenderItem(
      rareRing({
        name: 'Storm Loop',
        stats: [MF, ctc(14, 18, 'Ice Blast', 'on striking'), ctc(5, 3, 'Frost Nova', 'when struck')],
      }),
    );
    await waitFor(() => expect(screen.queryByText(/Fire Ball|Fire Wall/)).toBeNull());
    expect(screen.getAllByText(/Chance to cast/).map((el) => el.textContent)).toEqual([
      '14% Chance to cast level 18 Ice Blast on striking',
      '5% Chance to cast level 3 Frost Nova when struck',
    ]);

    rerenderItem(
      rareRing({ name: 'Sparkling Large Charm of Balance', quality: 'Magic', type: 'Large Charm', stats: [MF] }),
    );
    await waitFor(() => expect(screen.queryByText(/Chance to cast/)).toBeNull());
    expect(screen.getByText('+30% Better Chance of Getting Magic Items')).not.toBeNull();
  });
});

describe('ItemOverlayWidget market search', () => {
  it('starts with an idle hint and no request', () => {
    renderWidget(rareRing());
    expect(screen.getByText('Ready to search')).not.toBeNull();
    expect(getMarketListings).not.toHaveBeenCalled();
  });

  it('shows a loading state, then the listings with match counts', async () => {
    const { promise, resolve } = Promise.withResolvers<MarketListingResult>();
    getMarketListings.mockReturnValue(promise);
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    expect(await screen.findByText('Loading market listings...')).not.toBeNull();
    expect(screen.queryByText('Ready to search')).toBeNull();

    await act(async () => resolve(page([listing({ hr_price: 2 }), listing({ hr_price: 0, price: 'offer me' })], 57)));
    expect(await screen.findByText('2 HR')).not.toBeNull();
    expect(screen.getByText('offer me')).not.toBeNull();
    expect(screen.getByText('57')).not.toBeNull();
    expect(screen.getByText('· showing 2')).not.toBeNull();
    expect(screen.queryByText('Loading market listings...')).toBeNull();

    const q = lastQuery();
    expect(q.$limit).toBe(20);
    expect(q.$skip).toBe(0);
    expect(q.is_ladder).toBe(true);
    expect(q.is_hardcore).toBe(false);
  });

  it('truncates long free-text prices and shows "-" when there is no price', async () => {
    const note = 'x'.repeat(50);
    getMarketListings.mockResolvedValue(
      page([listing({ hr_price: 0, price: note }), listing({ hr_price: 0, price: '' })]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    expect(await screen.findByText(`${'x'.repeat(40)}...`)).not.toBeNull();
    expect(screen.getByText('-', { selector: 'span' })).not.toBeNull();
  });

  it('shows listing badges for ethereal, corrupted and socketed items', async () => {
    getMarketListings.mockResolvedValue(
      page([listing({ item: { name: 'x', is_ethereal: true, socket_count: 3, corruptions: ['c'] } })]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    const row = (await screen.findByText('1.5 HR')).closest('tr')!;
    expect(within(row).getByText('E')).not.toBeNull();
    expect(within(row).getByText('C')).not.toBeNull();
    expect(within(row).getByText('3')).not.toBeNull();
  });

  it('shows a no-results state that suggests Show Expired only when it is off', async () => {
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    expect(await screen.findByText('No listings found')).not.toBeNull();
    expect(screen.getByText('Try loosening your stat filters or turn on Show Expired.')).not.toBeNull();

    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText('Try loosening your stat filters.')).not.toBeNull();
  });

  it('Show Expired routes the search to the archive', async () => {
    renderWidget(rareRing());
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListingsArchive).toHaveBeenCalledTimes(1));
    expect(getMarketListings).not.toHaveBeenCalled();
  });

  it('shows the error with a Retry that searches again', async () => {
    getMarketListings.mockRejectedValueOnce(new Error('Rate limited'));
    getMarketListings.mockResolvedValueOnce(page([listing({ hr_price: 7 })]));
    renderWidget(rareRing());
    fireEvent.click(searchButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("Couldn't load listings");
    expect(alert.textContent).toContain('Rate limited');
    expect(screen.queryByText('No listings found')).toBeNull();

    fireEvent.click(within(alert).getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('7 HR')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does nothing while settings are still loading', async () => {
    settingsLoading = true;
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    await act(async () => {});
    expect(getMarketListings).not.toHaveBeenCalled();
  });

  it('loads the next page when the end of the list scrolls into view, skipping duplicates', async () => {
    const first = Array.from({ length: 20 }, (_, i) => listing({ _id: `p1-${i}`, hr_price: i + 1 }));
    getMarketListings.mockResolvedValueOnce(page(first, 25));
    getMarketListings.mockResolvedValueOnce(
      page([listing({ _id: 'p1-0', hr_price: 1 }), listing({ _id: 'p2-0', hr_price: 99 })], 25),
    );
    const item = rareRing();
    const { rerenderItem } = renderWidget(item);
    fireEvent.click(searchButton());
    expect(await screen.findByText('Load more')).not.toBeNull();

    inView = true;
    rerenderItem(item);
    expect(await screen.findByText('99 HR')).not.toBeNull();
    expect(lastQuery().$skip).toBe(20);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 21); // header + 20 + one new (duplicate dropped)
    // a short page means there is nothing more to load
    expect(screen.queryByText('Load more')).toBeNull();
  });

  it('after scrolling, a new search starts from the first page with the edited filters', async () => {
    const first = Array.from({ length: 20 }, (_, i) => listing({ _id: `a${i}`, hr_price: i + 1 }));
    getMarketListings.mockResolvedValueOnce(page(first, 23));
    getMarketListings.mockResolvedValueOnce(page([listing({ _id: 'a20', hr_price: 21 })], 23));
    const item = rareRing();
    const { rerenderItem } = renderWidget(item);
    fireEvent.click(statCheckbox('+30% Better Chance of Getting Magic Items'));
    fireEvent.click(searchButton());
    expect(await screen.findByText('Load more')).not.toBeNull();
    inView = true;
    rerenderItem(item);
    expect(await screen.findByText('21 HR')).not.toBeNull();
    inView = false;
    rerenderItem(item);

    // Editing the range or Show Expired fetches nothing until Search
    const min = screen.getByLabelText('% Better Chance of Getting Magic Items minimum');
    fireEvent.change(min, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('switch'));
    await act(async () => {});
    expect(getMarketListings).toHaveBeenCalledTimes(2);

    getMarketListings.mockResolvedValueOnce(page([listing({ _id: 'b0', hr_price: 77 })], 1));
    fireEvent.click(searchButton());
    expect(await screen.findByText('77 HR')).not.toBeNull();
    const q = lastQuery();
    expect(q.$skip).toBe(0);
    expect(JSON.stringify(q)).toContain('{"name":"item_magicbonus","values.0":{"$gte":1,"$lte":');
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1);
  });

  it('drops a page that arrives after a newer search started', async () => {
    const first = Array.from({ length: 20 }, (_, i) => listing({ _id: `a${i}` }));
    getMarketListings.mockResolvedValueOnce(page(first, 40));
    const late = Promise.withResolvers<MarketListingResult>();
    getMarketListings.mockReturnValueOnce(late.promise);
    const item = rareRing();
    const { rerenderItem } = renderWidget(item);
    fireEvent.click(searchButton());
    expect(await screen.findByText('Load more')).not.toBeNull();
    inView = true;
    rerenderItem(item);
    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(2));
    inView = false;
    rerenderItem(item);

    getMarketListings.mockResolvedValueOnce(page([listing({ _id: 'b0', hr_price: 77 })], 1));
    fireEvent.click(searchButton());
    expect(await screen.findByText('77 HR')).not.toBeNull();
    await act(async () => late.resolve(page([listing({ _id: 'a20', hr_price: 66 })], 40)));
    expect(screen.queryByText('66 HR')).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1);
  });

  it('copies a whisper to the seller of an online listing', async () => {
    vi.mocked(writeText).mockResolvedValue(undefined);
    getMarketListings.mockResolvedValue(
      page([
        listing({
          hr_price: 3,
          user_last_ingame: '2026-10-18T11:58:00Z',
          user: { username: 'webname', in_game_account: 'IngameAcc' },
          item: { name: 'Doom Coil' },
        }),
        listing({ hr_price: 4, user_last_ingame: '2026-10-18T10:00:00Z' }),
      ]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    await screen.findByText('3 HR');
    // only the recently-seen seller counts as online
    const buttons = screen.getAllByRole('button', { name: 'Copy whisper' });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("/w *IngameAcc Hi, I'm interested in your Doom Coil listed for 3 HR"),
    );
  });
});

describe('ItemOverlayWidget listing to quick-list', () => {
  it('List is disabled for items outside the shared stash', () => {
    renderWidget(rareRing());
    expect((screen.getByRole('button', { name: /List$/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens the quick-list panel at the cursor with the encoded item for stash items', () => {
    const item = rareRing({ location: 'Stash' });
    renderWidget(item);
    const list = screen.getByRole('button', { name: /List$/ }) as HTMLButtonElement;
    if (list.disabled) throw new Error('expected stash item to be listable');
    fireEvent.click(list);
    expect(overlay.openPanel).toHaveBeenCalledWith('quickList', { item: expect.any(String) }, { placement: 'cursor' });
    const { item: encoded } = vi.mocked(overlay.openPanel).mock.calls[0][1] as { item: string };
    expect(JSON.parse(decodeURIComponent(escape(atob(encoded))))).toEqual(item);
  });
});

describe('ItemOverlayWidget rare appraisal', () => {
  const appraisal = (overrides: Partial<RareAppraisal> = {}): RareAppraisal => ({
    id: 'a',
    name: 'Doom Coil',
    baseName: 'Ring',
    slot: 'ring',
    tab: null,
    position: null,
    verdict: 'keep',
    checkPriority: null,
    rank: 0.95,
    rankError: 0.1,
    stats: [
      {
        label: '+20% Faster Cast Rate',
        key: 'item_fastercastrate',
        value: 20,
        stars: 2,
        multiplier: 2.5,
        roll: 1,
        keyFrom: 10,
        corrupted: false,
      },
      {
        label: '30% MF',
        key: 'item_magicbonus',
        value: 30,
        stars: null,
        multiplier: null,
        roll: 0.5,
        keyFrom: 35,
        corrupted: false,
      },
    ],
    market: null,
    modelMode: 'softcore',
    modelVersion: 'v1',
    ...overrides,
  });

  it('shows the appraisal skeleton while loading', () => {
    rareState = { status: 'loading' };
    renderWidget(rareRing());
    expect(screen.getByText('Appraising rare...')).not.toBeNull();
  });

  it('a Keep verdict pre-selects key stats at their threshold and searches immediately', async () => {
    rareState = { status: 'done', response: { appraisal: appraisal(), history: null, reason: null } };
    renderWidget(rareRing());

    expect(screen.getByText('Keep')).not.toBeNull();
    expect(screen.getByText('★★')).not.toBeNull();
    expect(screen.getByText('valuable from 35')).not.toBeNull();
    expect((screen.getByLabelText('% Faster Cast Rate minimum') as HTMLInputElement).value).toBe('20');
    expect((screen.getByLabelText('% Faster Cast Rate maximum') as HTMLInputElement).value).toBe('');
    // only starred stats are pre-selected
    expect(screen.queryByLabelText('% Better Chance of Getting Magic Items minimum')).toBeNull();

    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(lastQuery())).toContain('{"name":"item_fastercastrate","values.0":{"$gte":20}}');
  });

  it('other verdicts pre-select but wait for the user to search', async () => {
    rareState = {
      status: 'done',
      response: { appraisal: appraisal({ verdict: 'check' }), history: null, reason: null },
    };
    renderWidget(rareRing());
    expect(screen.getByLabelText('% Faster Cast Rate minimum')).not.toBeNull();
    await act(async () => {});
    expect(getMarketListings).not.toHaveBeenCalled();
  });

  it('shows the server reason when there is no appraisal', () => {
    rareState = { status: 'done', response: { appraisal: null, history: null, reason: 'unknown base' } };
    renderWidget(rareRing());
    expect(screen.getByText('Appraisal note: unknown base')).not.toBeNull();
    expect(screen.queryByText('Keep')).toBeNull();
  });

  it('explains a crafted gate-off reason in plain words and keeps the detail on hover', () => {
    const reason = 'crafted slot unreliable: backtest MAE not better than the crafted median';
    rareState = {
      status: 'done',
      response: { appraisal: null, history: null, reason, quality: 'Crafted', recipe: null },
    };
    renderWidget(rareRing({ name: 'Storm Grip', quality: 'Crafted', type: 'Vampirebone Gloves' }));
    const note = screen.getByText(/^Appraisal note:/);
    expect(note.textContent).toBe(
      "Appraisal note: crafted items in this slot can't be appraised reliably yet (too little crafted data)",
    );
    expect(note.getAttribute('title')).toBe(reason);
  });
});

describe('ItemOverlayWidget extra header behaviour', () => {
  it('toggles a rare between searching its exact base and its whole item type', async () => {
    renderWidget(rareRing());
    const mode = screen.getByTitle('Click to toggle search mode');
    expect(mode.textContent).toBe('Base: Ring');
    fireEvent.click(mode);
    await waitFor(() => expect(screen.getByTitle('Click to toggle search mode').textContent).toBe('Type: Jewelry'));

    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalled());
    expect(JSON.stringify(lastQuery())).toContain('amul');
    expect(JSON.stringify(lastQuery())).not.toContain('"rin"');

    fireEvent.click(screen.getByTitle('Click to toggle search mode'));
    await waitFor(() => expect(screen.getByTitle('Click to toggle search mode').textContent).toBe('Base: Ring'));
  });

  it('Net Worth opens the currency panel', () => {
    renderWidget(rareRing());
    fireEvent.click(screen.getByRole('button', { name: 'Net Worth' }));
    expect(overlay.openPanel).toHaveBeenCalledWith('currency');
  });

  it('titles a Rainbow Facet by element and rolls, and prices that exact facet', async () => {
    vi.mocked(fetchItemPrice).mockResolvedValue(null);
    renderWidget({
      name: 'Rainbow Facet',
      quality: 'Unique',
      type: 'Jewel',
      iLevel: 85,
      stats: [
        { stat_id: 48, name: 'Fire Damage', value: 50 },
        { stat_id: 329, name: '+5% to Fire Skill Damage', value: 5 },
        { stat_id: 333, name: '-5% to Enemy Fire Resistance', value: -5 },
      ],
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Fire Facet 5/5');
    await waitFor(() => expect(fetchItemPrice).toHaveBeenCalled());
    expect(vi.mocked(fetchItemPrice).mock.calls[0][0]).toBe('rainbow_facet_fire_5_5');
    expect(fetchItemPriceByName).not.toHaveBeenCalled();
  });

  it("shows the item's own corruption price separately from the top corruptions", async () => {
    vi.mocked(fetchItemPriceByName).mockResolvedValue(priceData());
    vi.mocked(fetchCorruptionPrices).mockResolvedValue({
      typeCode: 'helm',
      baseCode: 'harlequin_crest',
      itemName: 'Harlequin Crest',
      corruptionPrices: [
        {
          corruptionKey: ['item_tohit_percent'],
          corruptionName: 'Tohit Percent',
          averagePrice: 5,
          medianPrice: 5.5,
          sampleCount: 8,
          socketPrices: [{ socketCount: 1, averagePrice: 6, medianPrice: 6.25, sampleCount: 3 }],
        },
        { corruptionKey: ['item_maxhp'], corruptionName: 'Maxhp', averagePrice: 4, medianPrice: 4, sampleCount: 2 },
      ],
    });
    // stat 360 carries the cube corruption key: 3 = attack rating %
    renderWidget(shako({ sockets: 1, stats: [{ stat_id: 360, name: 'Corrupted', value: 3 }] }));
    const img = await screen.findByAltText('Harlequin Crest');
    fireEvent.mouseEnter(img.parentElement!.parentElement!);
    const popover = await screen.findByRole('dialog');
    await within(popover).findByText('Top Corruptions');

    const own = within(popover).getByText("This Item's Corruption").closest('div.border-t') as HTMLElement;
    expect(own.textContent).toContain('Tohit Percent');
    expect(own.textContent).toContain('5.50 HR');
    // listed once: the top list leaves out the item's own corruption
    expect(within(popover).getAllByText('Tohit Percent')).toHaveLength(1);
    expect(within(popover).getByText('Maxhp')).not.toBeNull();

    // socket breakdown: picking a socket count filters on exactly that many sockets
    fireEvent.mouseEnter(within(own).getByText('Tohit Percent').closest('[role="button"]')!.parentElement!);
    fireEvent.click(await screen.findByText(/1 Socket$/));
    await waitFor(() => expect(getMarketListings).toHaveBeenCalled());
    const q = lastQuery();
    expect(q['item.socket_count']).toEqual({ $gte: 1, $lte: 1 });
    expect(q['item.corruptions']).toEqual({ $all: ['item_tohit_percent'] });
  });
});

describe('ItemOverlayWidget sockets and ethereal rows', () => {
  it('turns item sockets and ethereal flags into filterable rows', async () => {
    renderWidget(rareRing({ type: 'Shako', sockets: 2, isEthereal: true }));
    fireEvent.click(statCheckbox('Socketed (2)'));
    expect((screen.getByLabelText('Sockets minimum') as HTMLInputElement).value).toBe('2');
    fireEvent.click(statCheckbox('Ethereal'));
    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalled());
    const q = lastQuery();
    expect(q['item.socket_count']).toEqual({ $gte: 2, $lte: 2 });
    expect(q['item.is_ethereal']).toBe(true);
  });

  // BUG: useStatSelection.ts isItemCorruptable compares the Jewelry typeValue ('{"$in": ["amul", "ring", "amus"]}')
  // against the 'rin'/'amu' whitelist entries, so rings and amulets never get the Corrupted filter row.
  it.fails('offers the Corrupted filter on rare rings', () => {
    renderWidget(rareRing());
    expect(screen.getByRole('checkbox', { name: 'Corrupted filter' })).not.toBeNull();
  });
});
