// @vitest-environment happy-dom
import React from 'react';
import { MotionGlobalConfig } from 'framer-motion';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInView } from 'react-intersection-observer';
import { useOptions } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { clearListingPresenceCache } from '@/hooks/useListingPresence';
import { MarketBackendError, searchMarketListings, type MarketSearchPage } from '@/lib/market-search-api';
import type * as MarketSearchApi from '@/lib/market-search-api';
import { reportApiError } from '@/lib/error-reporting';
import type { ListingPresence, MarketFilters, ScoredListing } from '@/pages/market/lib/types';
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
import type { Item, Stat } from '../lib/interfaces';
import ItemOverlayWidget from './ItemOverlayWidget';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/lib/market-search-api', async (importOriginal) => ({
  ...(await importOriginal<typeof MarketSearchApi>()),
  searchMarketListings: vi.fn(),
}));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
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
// Listing hover detail belongs to quick-list; a stub keeps these tests about the price check itself.
vi.mock('../../quick-list/components/ItemStatsDisplay', () => ({
  default: ({ stashItem }: { stashItem: { name?: string } }) => (
    <div data-testid="listing-stats">{stashItem?.name}</div>
  ),
}));
// The Simulator popover has its own tests (SimulatorButton.test.tsx).
vi.mock('./SimulatorButton', () => ({ SimulatorButton: () => null }));

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

/** A PD2 page; `fetched` (the rows PD2 sent) exceeds `data` when it held item-less listings that were dropped. */
const page = (data: MarketListingEntry[], total = data.length, fetched = data.length): MarketListingResult => ({
  data,
  total,
  limit: 20,
  skip: 0,
  fetched,
});

/** A market service page of these listings; `rest` adds the service's per-row fields (status, lifetime). */
const servicePage = (
  data: MarketListingEntry[],
  total = data.length,
  fetched = data.length,
  rest: Partial<Omit<ScoredListing, 'listing'>> = {},
): MarketSearchPage => ({
  items: data.map((l) => ({ listing: l, pseudo: {}, score: null, value: null, ...rest })),
  total,
  totalExact: true,
  fetched,
});

// ---------------------------------------------------------------- mock state

let settings: Record<string, unknown>;
let settingsLoading: boolean;
let rareState: RareAppraisalState;
let inView: boolean;
const getMarketListings = vi.fn<(query: MarketListingQuery) => Promise<MarketListingResult>>();
const getMarketListingsArchive = vi.fn<(query: MarketListingQuery) => Promise<MarketListingResult>>();
const searchListings = vi.mocked(searchMarketListings);
const getListingPresence = vi.fn<(ids: string[]) => Promise<Map<string, ListingPresence>>>();

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
  searchListings.mockReset().mockResolvedValue(servicePage([]));
  getListingPresence.mockReset().mockResolvedValue(new Map());
  vi.mocked(reportApiError).mockReset();
  clearListingPresenceCache();

  // Hook mocks expose only what the widget reads; the real context values carry many more members.
  vi.mocked(useOptions).mockImplementation(
    () => ({ settings, isLoading: settingsLoading }) as unknown as ReturnType<typeof useOptions>,
  );
  vi.mocked(usePd2Website).mockImplementation(
    () =>
      ({
        getMarketListings,
        getMarketListingsArchive,
        marketApi: { getListingPresence },
      }) as unknown as ReturnType<typeof usePd2Website>,
  );
  vi.mocked(useRareAppraisal).mockImplementation(() => rareState);
  vi.mocked(useInView).mockImplementation(() => ({ ref: () => {}, inView }) as unknown as ReturnType<typeof useInView>);
  vi.mocked(fetchItemPriceByName).mockResolvedValue(null);
  vi.mocked(fetchCorruptionPrices).mockResolvedValue(null);
  vi.mocked(fetchPriceHistory).mockResolvedValue(null);
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
/** The rare header's toggles, by their (changing) visible text: the hint is a tooltip, not a title. */
const QUALITY_TOGGLE = /^((Any|Normal|Superior|Magic|Crafted|Rare)\s*)+$/;
const MODE_TOGGLE = /^((Base|Type|Group): .+)+$/;
const qualityToggle = () => screen.getByRole('button', { name: QUALITY_TOGGLE });
const modeToggle = () => screen.getByRole('button', { name: MODE_TOGGLE });
const lastQuery = (fn = getMarketListings) => fn.mock.calls[fn.mock.calls.length - 1][0];
/** The listed searches on the market service (an empty search's relaxation counts ask for one row, aside). */
const realSearches = () => searchListings.mock.calls.filter(([, opts]) => opts.limit !== 1);
/** The filters and page of the last listed market service search. */
const lastFilters = (): MarketFilters => realSearches()[realSearches().length - 1][0];
const lastPage = () => realSearches()[realSearches().length - 1][1].page;

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

  it('lets a rare cycle the searched quality through Any, every other base quality and back', async () => {
    renderWidget(rareRing());
    const toggle = qualityToggle();
    expect(toggle.textContent).toBe('Rare');
    for (const next of ['Any', 'Normal', 'Superior', 'Magic', 'Crafted', 'Rare']) {
      fireEvent.click(toggle);
      // the outgoing label animates out, so wait until only the new one remains
      await waitFor(() => expect(qualityToggle().textContent).toBe(next));
    }
  });

  it('the cycled quality is what the market search asks for', async () => {
    renderWidget(rareRing());
    fireEvent.click(qualityToggle()); // -> Any
    fireEvent.click(qualityToggle()); // -> Normal
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    expect(lastFilters().rarity).toEqual(['Normal']);
  });

  it('"Any" searches every base quality, so rares and crafted come back together', async () => {
    renderWidget(rareRing());
    fireEvent.click(qualityToggle()); // -> Any
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    expect(lastFilters().rarity).toEqual(['Normal', 'Superior', 'Magic', 'Rare', 'Crafted']);
  });

  it('uniques have no quality/search-mode toggles', () => {
    renderWidget(shako());
    expect(screen.queryByRole('button', { name: QUALITY_TOGGLE })).toBeNull();
    expect(screen.queryByRole('button', { name: MODE_TOGGLE })).toBeNull();
  });

  it('Close and Settings do what they say', () => {
    const { onClose } = renderWidget(rareRing());
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(overlay.openPanel).toHaveBeenCalledWith('settings');
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
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    const f = lastFilters();
    expect(f.stats).toEqual([expect.objectContaining({ kind: 'corruption', key: 'item_corr_2' })]);
    expect(f.corrupted).toBe('yes');
    expect(f.status).toEqual(['sold', 'removed', 'expired']);
    expect(getMarketListingsArchive).not.toHaveBeenCalled();
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
    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(1));
    expect(lastFilters().stats.map(({ id: _id, ...row }) => row)).toEqual([
      { kind: 'mod', key: 'item_fastercastrate', enabled: true },
    ]);
  });

  it('edited min/max values are what the search filters on', async () => {
    renderWidget(rareRing());
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.change(screen.getByLabelText('% Faster Cast Rate minimum'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('% Faster Cast Rate maximum'), { target: { value: '' } });
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(1));
    expect(lastFilters().stats.map(({ id: _id, ...row }) => row)).toEqual([
      { kind: 'mod', key: 'item_fastercastrate', min: 15, enabled: true },
    ]);
  });

  it('Enter in a range input runs the search', async () => {
    renderWidget(rareRing());
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.keyDown(screen.getByLabelText('% Faster Cast Rate minimum'), { key: 'Enter' });
    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(1));
  });

  it('a new item clears the previous selection and results', async () => {
    searchListings.mockResolvedValue(servicePage([listing()], 1));
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
    expect(searchListings).not.toHaveBeenCalled();
  });

  it('shows a loading state, then the listings with match counts', async () => {
    const { promise, resolve } = Promise.withResolvers<MarketSearchPage>();
    searchListings.mockReturnValue(promise);
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    expect(await screen.findByText('Loading market listings...')).not.toBeNull();
    expect(screen.queryByText('Ready to search')).toBeNull();

    await act(async () =>
      resolve(servicePage([listing({ hr_price: 2 }), listing({ hr_price: 0, price: 'offer me' })], 57)),
    );
    expect(await screen.findByText('2 HR')).not.toBeNull();
    expect(screen.getByText('offer me')).not.toBeNull();
    expect(screen.getByText('57')).not.toBeNull();
    expect(screen.getByText('· showing 2')).not.toBeNull();
    expect(screen.queryByText('Loading market listings...')).toBeNull();

    expect(searchListings.mock.calls[0][1]).toEqual({ page: 0, limit: 20 });
    expect(lastFilters()).toMatchObject({ source: 'live', maxAgeDays: 3, ladder: true, hardcore: false });
    expect(lastFilters()).not.toHaveProperty('status');
    // Every search goes to the market service; PD2 only stands in for it
    expect(getMarketListings).not.toHaveBeenCalled();
  });

  it('truncates long free-text prices and shows "-" when there is no price', async () => {
    const note = 'x'.repeat(50);
    searchListings.mockResolvedValue(
      servicePage([listing({ hr_price: 0, price: note }), listing({ hr_price: 0, price: '' })]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    expect(await screen.findByText(`${'x'.repeat(40)}...`)).not.toBeNull();
    expect(screen.getByText('-', { selector: 'span' })).not.toBeNull();
  });

  it('shows listing badges for ethereal, corrupted and socketed items', async () => {
    searchListings.mockResolvedValue(
      servicePage([listing({ item: { name: 'x', is_ethereal: true, socket_count: 3, corruptions: ['c'] } })]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    const row = (await screen.findByText('1.5 HR')).closest('tr')!;
    expect(within(row).getByText('E')).not.toBeNull();
    expect(within(row).getByText('C')).not.toBeNull();
    expect(within(row).getByText('3')).not.toBeNull();
  });

  it('sorts from the column headers: a new column is descending, the same one again flips it', async () => {
    searchListings.mockResolvedValue(servicePage([listing()]));
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    await screen.findByText('1.5 HR');
    expect(lastFilters().sort).toEqual({ by: 'bumped', dir: 'desc' });

    fireEvent.click(screen.getByRole('button', { name: 'Price' }));
    await waitFor(() => expect(lastFilters().sort).toEqual({ by: 'price', dir: 'desc' }));
    expect(lastPage()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Price' }));
    await waitFor(() => expect(lastFilters().sort).toEqual({ by: 'price', dir: 'asc' }));
    fireEvent.click(screen.getByRole('button', { name: 'Age' }));
    await waitFor(() => expect(lastFilters().sort).toEqual({ by: 'bumped', dir: 'desc' }));
  });

  it('a cheapest-first search that PD2 answers sorts by HR price and leaves out unpriced listings', async () => {
    searchListings.mockResolvedValue(servicePage([listing()]));
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    await screen.findByText('1.5 HR');
    fireEvent.click(screen.getByRole('button', { name: 'Price' }));
    await waitFor(() => expect(lastFilters().sort.by).toBe('price'));

    searchListings.mockRejectedValueOnce(new MarketBackendError('down', 'unavailable', 503));
    getMarketListings.mockResolvedValueOnce(page([listing({ hr_price: 2 })]));
    fireEvent.click(screen.getByRole('button', { name: 'Price' }));
    expect(await screen.findByText('2 HR')).not.toBeNull();
    expect(lastQuery()).toMatchObject({ $sort: { hr_price: 1 }, hr_price: { $gt: 0 } });
  });

  it('the seller menu keeps sellers in game, on the site, or either; the count says how many', async () => {
    const now = new Date().toISOString();
    const old = '2026-10-01T00:00:00.000Z';
    searchListings.mockResolvedValue(
      servicePage([
        listing({ _id: 'g', hr_price: 1, user_last_ingame: now, user_last_online: old }),
        listing({ _id: 's', hr_price: 2, user_last_ingame: old, user_last_online: now }),
        listing({ _id: 'o', hr_price: 3, user_last_ingame: old, user_last_online: old }),
      ]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    await screen.findByText('3 HR');
    const shown = () => ['1 HR', '2 HR', '3 HR'].filter((p) => screen.queryByText(p));

    const pick = (name: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Seller filter' }));
      fireEvent.click(screen.getByRole('menuitemradio', { name }));
    };

    pick('In game');
    expect(shown()).toEqual(['1 HR']);
    expect(screen.getByText('· 1 in game')).not.toBeNull();

    pick('In game or on trade site');
    expect(shown()).toEqual(['1 HR', '2 HR']);
    expect(screen.getByText('· 2 online')).not.toBeNull();

    pick('On the trade site');
    expect(shown()).toEqual(['2 HR']);
    expect(screen.getByText('· 1 on site')).not.toBeNull();

    pick('Anyone');
    expect(shown()).toEqual(['1 HR', '2 HR', '3 HR']);
    // Filtering never searches again
    expect(searchListings).toHaveBeenCalledTimes(1);
  });

  it('a search that finds nothing shows each filter with what dropping it finds; one click drops it', async () => {
    // The real search (a page of 20) finds nothing; the counts (one row) depend on what they leave out
    searchListings.mockImplementation(async (f, opts) => {
      if (opts.limit !== 1) return servicePage([]);
      const fcr = f.stats.some((s) => s.key === 'item_fastercastrate');
      const anyQuality = f.rarity.length > 1;
      return servicePage([], !fcr ? 7 : anyQuality ? 3 : 0);
    });
    renderWidget(rareRing());
    fireEvent.click(statCheckbox('+20% Faster Cast Rate'));
    fireEvent.click(searchButton());

    expect(await screen.findByText('No listings match all these filters')).not.toBeNull();
    const chips = () => within(screen.getByRole('list', { name: 'Filters to drop' })).getAllByRole('button');
    // Every relaxation as a chip, in order (ranges, stats, base, quality), named with its count once it landed
    await waitFor(() =>
      expect(chips().map((b) => b.getAttribute('aria-label'))).toEqual([
        'Without Stat ranges: 0 listings',
        'Without +20% Faster Cast Rate: 7 listings',
        'Without Ring: 0 listings',
        'Without Rare: 3 listings',
      ]),
    );
    const fcrChip = () => screen.getByRole('button', { name: 'Without +20% Faster Cast Rate: 7 listings' });
    expect(screen.getByRole('button', { name: 'Show expired' })).not.toBeNull();
    // Counting asked one row per relaxation, never re-running the listed search
    expect(realSearches()).toHaveLength(1);

    // Hovering a chip rings the row it would drop (the chip repeats the row's text: find the row by its label)
    const fcrRow = () =>
      screen
        .getAllByText('+20% Faster Cast Rate')
        .map((e) => e.closest('label'))
        .find((l): l is HTMLLabelElement => !!l)!;
    expect(fcrRow().className).not.toMatch(/ring-primary/);
    fireEvent.mouseEnter(fcrChip());
    expect(fcrRow().className).toMatch(/ring-primary/);
    fireEvent.mouseLeave(fcrChip());
    expect(fcrRow().className).not.toMatch(/ring-primary/);

    fireEvent.click(fcrChip());
    await waitFor(() => expect(realSearches()).toHaveLength(2));
    expect(realSearches()[1][0].stats).toEqual([]);
    expect(fcrRow().querySelector('[role="checkbox"]')!.getAttribute('aria-checked')).toBe('false');
  });

  it('Expired searches every ended listing (sold, removed, expired) on the market service', async () => {
    renderWidget(rareRing());
    fireEvent.click(screen.getByRole('radio', { name: 'Expired' }));
    expect(searchListings).not.toHaveBeenCalled();
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(1));
    expect(lastFilters()).toMatchObject({ source: 'archive', maxAgeDays: 14, status: ['sold', 'removed', 'expired'] });
    expect(getMarketListingsArchive).not.toHaveBeenCalled();
  });

  it('switching between Live and Expired after a search searches again', async () => {
    renderWidget(rareRing());
    fireEvent.click(searchButton());
    await waitFor(() => expect(realSearches()).toHaveLength(1));
    expect(lastFilters().source).not.toBe('archive');

    fireEvent.click(screen.getByRole('radio', { name: 'Expired' }));
    await waitFor(() => expect(realSearches()).toHaveLength(2));
    expect(lastFilters()).toMatchObject({ source: 'archive' });
    expect(screen.getByRole('radio', { name: 'Expired' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByRole('radio', { name: 'Live' }));
    await waitFor(() => expect(realSearches()).toHaveLength(3));
    expect(lastFilters().source).not.toBe('archive');
  });

  it('says how long each ended listing was up and how it ended', async () => {
    searchListings.mockResolvedValue(
      servicePage([listing({ hr_price: 4 })], 1, 1, {
        status: 'sold',
        listedAt: '2026-10-14T12:00:00.000Z',
        endedAt: '2026-10-16T12:00:00.000Z',
        durationSeconds: 2 * 86400,
      }),
    );
    renderWidget(rareRing());
    fireEvent.click(screen.getByRole('radio', { name: 'Expired' }));
    fireEvent.click(searchButton());
    const row = (await screen.findByText('4 HR')).closest('tr')!;
    const ended = within(row).getByText('sold after 2 days');
    fireEvent.focus(ended);
    expect((await screen.findByRole('tooltip')).textContent).toBe('Ended 2 days ago');
  });

  it('asks PD2 for the page when the market service fails, and reports the failure', async () => {
    const outage = new MarketBackendError('The market service answered 503.', 'unavailable', 503);
    searchListings.mockRejectedValueOnce(outage);
    getMarketListings.mockResolvedValueOnce(page([listing({ hr_price: 5 })]));
    renderWidget(rareRing());
    fireEvent.click(searchButton());

    expect(await screen.findByText('5 HR')).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(lastQuery()).toMatchObject({ $skip: 0, $limit: 20, 'item.quality.name': 'Rare' });
    expect(reportApiError).toHaveBeenCalledWith(
      outage,
      'market-service',
      '/api/market/search',
      503,
      expect.objectContaining({ fallback: 'pd2' }),
    );
  });

  it('sends only searches the market service cannot express to PD2 (a skill matched by its line)', async () => {
    // A skill missing from the skill tables: PD2 matches it by the modifier label, the service can't
    // BH exports such lines without a stat id
    const zorbo = { name: '15% Chance to cast level 20 Zorbo Blast on attack' } as Stat;
    renderWidget(rareRing({ stats: [FCR, zorbo] }));
    fireEvent.click(statCheckbox('15% Chance to cast level 20 Zorbo Blast on attack'));
    fireEvent.click(searchButton());
    await waitFor(() => expect(getMarketListings).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(lastQuery())).toContain('"label"');
    expect(searchListings).not.toHaveBeenCalled();

    // Without that row the next search is the service's again
    fireEvent.click(statCheckbox('15% Chance to cast level 20 Zorbo Blast on attack'));
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(1));
  });

  it('shows the error with a Retry that searches again', async () => {
    // The service is down and PD2, standing in, fails too
    searchListings.mockRejectedValueOnce(new MarketBackendError('down', 'unavailable', 503));
    getMarketListings.mockRejectedValueOnce(new Error('Rate limited'));
    searchListings.mockResolvedValueOnce(servicePage([listing({ hr_price: 7 })]));
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
    expect(searchListings).not.toHaveBeenCalled();
  });

  it('loads the next page when the end of the list scrolls into view, skipping duplicates', async () => {
    const first = Array.from({ length: 20 }, (_, i) => listing({ _id: `p1-${i}`, hr_price: i + 1 }));
    searchListings.mockResolvedValueOnce(servicePage(first, 25));
    searchListings.mockResolvedValueOnce(
      servicePage([listing({ _id: 'p1-0', hr_price: 1 }), listing({ _id: 'p2-0', hr_price: 99 })], 25),
    );
    const item = rareRing();
    const { rerenderItem } = renderWidget(item);
    fireEvent.click(searchButton());
    expect(await screen.findByText('Load more')).not.toBeNull();

    inView = true;
    rerenderItem(item);
    expect(await screen.findByText('99 HR')).not.toBeNull();
    expect(lastPage()).toBe(1);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 21); // header + 20 + one new (duplicate dropped)
    // a short page means there is nothing more to load
    expect(screen.queryByText('Load more')).toBeNull();
  });

  it('keeps Load more when a full page of rows held an item-less listing', async () => {
    // PD2 sent 20 rows; the one without an item was dropped before reaching the widget
    const first = Array.from({ length: 19 }, (_, i) => listing({ _id: `p1-${i}`, hr_price: i + 1 }));
    searchListings.mockResolvedValueOnce(servicePage(first, 30, 20));
    searchListings.mockResolvedValueOnce(servicePage([listing({ _id: 'p2-0', hr_price: 99 })], 30));
    const item = rareRing();
    const { rerenderItem } = renderWidget(item);
    fireEvent.click(searchButton());
    expect(await screen.findByText('Load more')).not.toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(1 + 19);

    inView = true;
    rerenderItem(item);
    expect(await screen.findByText('99 HR')).not.toBeNull();
    expect(lastPage()).toBe(1);
  });

  it('after scrolling, a new search starts from the first page with the edited filters', async () => {
    const first = Array.from({ length: 20 }, (_, i) => listing({ _id: `a${i}`, hr_price: i + 1 }));
    searchListings.mockResolvedValueOnce(servicePage(first, 23));
    searchListings.mockResolvedValueOnce(servicePage([listing({ _id: 'a20', hr_price: 21 })], 23));
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

    // Editing the range fetches nothing until Search
    const min = screen.getByLabelText('% Better Chance of Getting Magic Items minimum');
    fireEvent.change(min, { target: { value: '1' } });
    await act(async () => {});
    expect(searchListings).toHaveBeenCalledTimes(2);

    searchListings.mockResolvedValueOnce(servicePage([listing({ _id: 'b0', hr_price: 77 })], 1));
    fireEvent.click(searchButton());
    expect(await screen.findByText('77 HR')).not.toBeNull();
    expect(lastPage()).toBe(0);
    expect(lastFilters().stats).toEqual([expect.objectContaining({ key: 'item_magicbonus', min: 1 })]);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1);
  });

  it('drops a page that arrives after a newer search started', async () => {
    const first = Array.from({ length: 20 }, (_, i) => listing({ _id: `a${i}` }));
    searchListings.mockResolvedValueOnce(servicePage(first, 40));
    const late = Promise.withResolvers<MarketSearchPage>();
    searchListings.mockReturnValueOnce(late.promise);
    const item = rareRing();
    const { rerenderItem } = renderWidget(item);
    fireEvent.click(searchButton());
    expect(await screen.findByText('Load more')).not.toBeNull();
    inView = true;
    rerenderItem(item);
    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(2));
    inView = false;
    rerenderItem(item);

    searchListings.mockResolvedValueOnce(servicePage([listing({ _id: 'b0', hr_price: 77 })], 1));
    fireEvent.click(searchButton());
    expect(await screen.findByText('77 HR')).not.toBeNull();
    await act(async () => late.resolve(servicePage([listing({ _id: 'a20', hr_price: 66 })], 40)));
    expect(screen.queryByText('66 HR')).toBeNull();
    expect(screen.getAllByRole('row')).toHaveLength(1 + 1);
  });

  it('copies a whisper to the seller of an online listing', async () => {
    vi.mocked(writeText).mockResolvedValue(undefined);
    searchListings.mockResolvedValue(
      servicePage([
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

  it("pops in the sellers' current presence from PD2 after the rows render, in the same order", async () => {
    settings.pd2Token = 'token';
    const lookup = Promise.withResolvers<Map<string, ListingPresence>>();
    getListingPresence.mockReturnValue(lookup.promise);
    searchListings.mockResolvedValue(
      servicePage([
        listing({ _id: 'a', hr_price: 1, user_last_ingame: '2026-10-18T09:00:00Z' }),
        listing({ _id: 'b', hr_price: 2, user_last_ingame: '2026-10-18T09:00:00Z' }),
      ]),
    );
    renderWidget(rareRing());
    fireEvent.click(searchButton());

    // Rows show before PD2 answered, with the stored (stale) presence: nobody online
    expect(await screen.findByText('2 HR')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy whisper' })).toBeNull();
    expect(getListingPresence).toHaveBeenCalledWith(['a', 'b']);

    await act(async () =>
      lookup.resolve(new Map([['b', { user_last_online: null, user_last_ingame: '2026-10-18T11:59:00Z' }]])),
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByText(/HR$/).textContent)).toEqual(['1 HR', '2 HR']);
    expect(within(rows[1]).getByRole('button', { name: 'Copy whisper' })).not.toBeNull();
    expect(within(rows[0]).queryByRole('button', { name: 'Copy whisper' })).toBeNull();
  });
});

describe('ItemOverlayWidget secondary actions', () => {
  const LIST_DISABLED = 'Item must be in your stash (shared or personal) to list.';

  it('greys out List with the reason for items outside a stash, and lists nothing', async () => {
    renderWidget(rareRing());
    const list = screen.getByRole('button', { name: 'List' });
    expect(list.getAttribute('aria-disabled')).toBe('true');
    await act(async () => {
      fireEvent.focus(list);
    });
    expect((await screen.findByRole('tooltip')).textContent).toContain(LIST_DISABLED);
    fireEvent.click(list);
    expect(vi.mocked(overlay.openPanel).mock.calls.some(([id]) => id === 'quickList')).toBe(false);
  });

  it('List opens the quick-list panel with the encoded item for stash items', () => {
    const item = rareRing({ location: 'Stash' });
    renderWidget(item);
    const list = screen.getByRole('button', { name: 'List' });
    expect(list.getAttribute('aria-disabled')).toBe('false');
    fireEvent.click(list);
    expect(overlay.openPanel).toHaveBeenCalledWith('quickList', { item: expect.any(String) });
    const { item: encoded } = vi.mocked(overlay.openPanel).mock.calls[0][1] as { item: string };
    expect(JSON.parse(decodeURIComponent(escape(atob(encoded))))).toEqual(item);
  });

  it('opens the same search on projectdiablo2.com, whether or not the item can be listed', () => {
    renderWidget(rareRing());
    fireEvent.click(screen.getByRole('button', { name: 'Open search on projectdiablo2.com' }));
    expect(vi.mocked(openUrl).mock.calls[0][0]).toMatch(/^https:\/\/(www\.)?projectdiablo2\.com\//);
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

    await waitFor(() => expect(searchListings).toHaveBeenCalledTimes(1));
    expect(lastFilters().stats).toEqual([expect.objectContaining({ key: 'item_fastercastrate', min: 20 })]);
  });

  it('other verdicts pre-select but wait for the user to search', async () => {
    rareState = {
      status: 'done',
      response: { appraisal: appraisal({ verdict: 'check' }), history: null, reason: null },
    };
    renderWidget(rareRing());
    expect(screen.getByLabelText('% Faster Cast Rate minimum')).not.toBeNull();
    await act(async () => {});
    expect(searchListings).not.toHaveBeenCalled();
  });

  it('shows the server reason when there is no appraisal', () => {
    rareState = { status: 'done', response: { appraisal: null, history: null, reason: 'unknown base' } };
    renderWidget(rareRing());
    expect(screen.getByText('Appraisal note: unknown base')).not.toBeNull();
    expect(screen.queryByText('Keep')).toBeNull();
  });

  it('explains a crafted gate-off reason in plain words and keeps the detail on hover', async () => {
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
    fireEvent.focus(note);
    expect((await screen.findByRole('tooltip')).textContent).toBe(reason);
  });
});

describe('ItemOverlayWidget extra header behaviour', () => {
  it('toggles a rare between searching its exact base and its whole item type', async () => {
    renderWidget(rareRing());
    const mode = modeToggle();
    expect(mode.textContent).toBe('Base: Ring');
    fireEvent.click(mode);
    await waitFor(() => expect(modeToggle().textContent).toBe('Type: Jewelry'));

    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    expect(JSON.stringify(lastFilters())).toContain('amul');
    expect(lastFilters().baseCode).toBeUndefined();

    fireEvent.click(modeToggle());
    await waitFor(() => expect(modeToggle().textContent).toBe('Base: Ring'));
  });

  it("cycles a rare bow's base → type → type group → base, searching the group's members", async () => {
    renderWidget(rareRing({ name: 'Grim Fletch', type: 'Ceremonial Bow' }));
    expect(modeToggle().textContent).toBe('Base: Ceremonial Bow');
    fireEvent.click(modeToggle());
    await waitFor(() => expect(modeToggle().textContent).toBe('Type: Amazon Bow'));
    fireEvent.click(modeToggle());
    await waitFor(() => expect(modeToggle().textContent).toBe('Group: Bows'));

    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    expect(lastFilters()).toMatchObject({ typeCode: 'group:bows' });
    expect(lastFilters().baseCode).toBeUndefined();

    fireEvent.click(modeToggle());
    await waitFor(() => expect(modeToggle().textContent).toBe('Base: Ceremonial Bow'));
  });

  it('toggles a rare without a type group (Sorceress Orb) between base and type only', async () => {
    renderWidget(rareRing({ name: 'Doom Eye', type: 'Eagle Orb' }));
    fireEvent.click(modeToggle());
    await waitFor(() => expect(modeToggle().textContent).toBe('Type: Sorceress Orb'));
    fireEvent.click(modeToggle());
    await waitFor(() => expect(modeToggle().textContent).toBe('Base: Eagle Orb'));
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
          corruptionKey: ['tohit'],
          corruptionName: 'Tohit Percent',
          averagePrice: 5,
          medianPrice: 5.5,
          sampleCount: 8,
          socketPrices: [{ socketCount: 1, averagePrice: 6, medianPrice: 6.25, sampleCount: 3 }],
        },
        { corruptionKey: ['maxhp'], corruptionName: 'Maxhp', averagePrice: 4, medianPrice: 4, sampleCount: 2 },
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
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    const f = lastFilters();
    expect(f).toMatchObject({ socketsMin: 1, socketsMax: 1 });
    expect(f.stats).toContainEqual(expect.objectContaining({ kind: 'corruption', key: 'tohit' }));
  });
});

describe('ItemOverlayWidget item switch', () => {
  it('leaves no rows of the previous item behind when it listed a stat twice', async () => {
    const { rerenderItem } = renderWidget(
      rareRing({
        stats: [
          { stat_id: 105, name: 'Faster Cast Rate', value: 10 },
          { stat_id: 105, name: 'Faster Cast Rate', value: 10, corrupted: true },
        ],
      }),
    );
    expect(screen.getAllByText(/Faster Cast Rate/)).toHaveLength(1);
    rerenderItem(shako());
    // Rows leave through an exit animation
    await waitFor(() => expect(screen.queryByText(/Faster Cast Rate/)).toBeNull(), { timeout: 3000 });
    expect(screen.getByText('+2 to All Skills')).not.toBeNull();
  });
});

describe('ItemOverlayWidget sockets and ethereal rows', () => {
  it('turns item sockets and ethereal flags into filterable rows', async () => {
    renderWidget(rareRing({ type: 'Shako', sockets: 2, isEthereal: true }));
    fireEvent.click(statCheckbox('Socketed (2)'));
    expect((screen.getByLabelText('Sockets minimum') as HTMLInputElement).value).toBe('2');
    fireEvent.click(statCheckbox('Ethereal'));
    fireEvent.click(searchButton());
    await waitFor(() => expect(searchListings).toHaveBeenCalled());
    expect(lastFilters()).toMatchObject({ socketsMin: 2, socketsMax: 2, ethereal: 'yes' });
  });

  it('offers the Corrupted filter on rare rings', () => {
    renderWidget(rareRing());
    expect(screen.getByRole('checkbox', { name: 'Corrupted filter' })).not.toBeNull();
  });
});
