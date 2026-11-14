// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fetch as browserFetch } from '@/lib/browser-http';
import type { CharacterDetail, PricedEquippedItem } from '@/lib/builds-api';
import { fetchMultipleItemPrices, type AveragePriceResponse } from '@/pages/currency/lib/price-api';
import { getCurrentSeason } from '@/lib/seasons';
import {
  applyCorruptionPrices,
  clearCorruptionValueCache,
  corruptionListingsValue,
  corruptionPricedHr,
  corruptionQueryOf,
  corruptionValue,
  type CorruptionQuery,
  type PriceCheckComparable,
  useCorruptionPrices,
} from './corruption-value';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/pages/currency/lib/price-api', () => ({ fetchMultipleItemPrices: vi.fn() }));

const fetchMock = vi.mocked(browserFetch);
const plainPricesMock = vi.mocked(fetchMultipleItemPrices);

function item(overrides: Partial<PricedEquippedItem> = {}): PricedEquippedItem {
  return {
    slot: 'Right Hand',
    key: 'unique:blackhand_key',
    name: 'Blackhand Key',
    quality: 'Unique',
    base: 'Grave Wand',
    baseCode: 'gwn',
    runeword: false,
    ethereal: false,
    corrupted: true,
    sockets: 0,
    socketed: [],
    mods: ['Corrupted', '+1 to All Skills', '+2 to Necromancer Skills'],
    corruptedMods: ['+1 to All Skills'],
    iconUrl: null,
    priceHr: 0.08,
    ...overrides,
  };
}

const ALL_SKILLS: CorruptionQuery = {
  item: 'Blackhand Key',
  corruption: ['item_allskills'],
  sockets: null,
  hardcore: false,
};

const listing = (priceHr: number, overrides: Partial<PriceCheckComparable> = {}): PriceCheckComparable => ({
  priceHr,
  similarity: 1,
  corruptions: ['to All Skills'],
  sockets: 0,
  ...overrides,
});

const priceCheckReply = (comparables: PriceCheckComparable[], ignoredFilters: unknown[] = []) =>
  new Response(JSON.stringify({ comparables, ignoredFilters }), { status: 200 });

describe('corruptionQueryOf', () => {
  it('queries a corrupted unique by its corruption', () => {
    expect(corruptionQueryOf(item(), 'softcore')).toEqual(ALL_SKILLS);
    expect(corruptionQueryOf(item({ key: 'set:trang_oul_s_claws', name: "Trang-Oul's Claws" }), 'hardcore')).toEqual({
      item: "Trang-Oul's Claws",
      corruption: ['item_allskills'],
      sockets: null,
      hardcore: true,
    });
  });

  it('keeps the socket count of a socket corruption', () => {
    expect(corruptionQueryOf(item({ sockets: 3, corruptedMods: ['Socketed (3)'] }), 'softcore')?.sockets).toBe(3);
  });

  it('skips uncorrupted, non unique/set items and unknown corruptions', () => {
    expect(corruptionQueryOf(item({ corrupted: false }), 'softcore')).toBeNull();
    expect(corruptionQueryOf(item({ key: 'base:ci3:rare' }), 'softcore')).toBeNull();
    expect(corruptionQueryOf(item({ corruptedMods: [] }), 'softcore')).toBeNull();
    expect(corruptionQueryOf(item({ corruptedMods: undefined }), 'softcore')).toBeNull();
  });
});

describe('corruptionListingsValue', () => {
  it('averages the listings with exactly the corruption', () => {
    // Blackhand Key +1 to All Skills, last 30 days (live price check, 2026-11-14)
    const comparables = [0.5, 1, 1.5, 0.5, 0.75, 2.75].map((p) => listing(p));
    expect(corruptionListingsValue(comparables, ALL_SKILLS)).toBe(1.17);
  });

  it('leaves out near matches and listings with more corruption names', () => {
    const comparables = [
      listing(1),
      listing(1),
      listing(1),
      listing(0.1, { similarity: 0.5, corruptions: ['Faster Cast Rate'] }),
      listing(9, { corruptions: ['to All Skills', 'Faster Cast Rate'] }),
    ];
    expect(corruptionListingsValue(comparables, ALL_SKILLS)).toBe(1);
  });

  it('matches the socket count of a socket corruption', () => {
    const sockets: CorruptionQuery = { ...ALL_SKILLS, corruption: ['item_numsockets'], sockets: 3 };
    const comparables = [2, 2, 2, 0.1].map((p, i) => listing(p, { corruptions: ['Sockets'], sockets: i < 3 ? 3 : 2 }));
    expect(corruptionListingsValue(comparables, sockets)).toBe(2);
  });

  it('needs at least 3 listings', () => {
    expect(corruptionListingsValue([listing(0.5), listing(2)], ALL_SKILLS)).toBeNull();
  });
});

describe('corruptionValue', () => {
  beforeEach(() => clearCorruptionValueCache());
  afterEach(() => fetchMock.mockReset());

  const askedHours = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).hours);

  it('prices from the last 7 days when they have enough listings', async () => {
    fetchMock.mockResolvedValueOnce(priceCheckReply([listing(1), listing(1.2), listing(1.4)]));
    await expect(corruptionValue(ALL_SKILLS)).resolves.toBe(1.2);
    expect(askedHours()).toEqual([168]);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      item: 'Blackhand Key',
      corrupted: true,
      corruption: 'item_allskills',
      isLadder: true,
      isHardcore: false,
      hours: 168,
    });
  });

  it('falls back to 30 days, then to nothing', async () => {
    fetchMock
      .mockResolvedValueOnce(priceCheckReply([listing(0.5)]))
      .mockResolvedValueOnce(priceCheckReply([0.5, 1, 1.5, 0.5, 0.75, 2.75].map((p) => listing(p))));
    await expect(corruptionValue(ALL_SKILLS)).resolves.toBe(1.17);
    expect(askedHours()).toEqual([168, 720]);

    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => priceCheckReply([listing(0.5)]));
    await expect(corruptionValue({ ...ALL_SKILLS, hardcore: true })).resolves.toBeNull();
  });

  it('distrusts matches when the price check ignored a filter', async () => {
    fetchMock.mockImplementation(async () =>
      priceCheckReply([listing(1), listing(1), listing(1)], [{ field: 'corruption' }]),
    );
    await expect(corruptionValue(ALL_SKILLS)).resolves.toBeNull();
  });

  it('caches values but not failures', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
    await expect(corruptionValue(ALL_SKILLS)).rejects.toThrow('429');
    fetchMock.mockResolvedValueOnce(priceCheckReply([listing(1), listing(1), listing(1)]));
    await expect(corruptionValue(ALL_SKILLS)).resolves.toBe(1);
    await expect(corruptionValue(ALL_SKILLS)).resolves.toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('corruptionPricedHr', () => {
  it('is the corruption value for an item without socketed items', () => {
    expect(corruptionPricedHr(item(), 1.17, undefined)).toBe(1.17);
  });

  it('keeps what the sockets added on top of the plain item price', () => {
    const socketed = item({ priceHr: 0.53, socketed: [{ key: 'rune:r22', name: 'Um Rune', quality: null, mods: [] }] });
    expect(corruptionPricedHr(socketed, 1.17, 0.08)).toBe(1.62);
    // The plain item had too few sales to count: all of priceHr is the sockets
    expect(corruptionPricedHr(socketed, 1.17, 0)).toBe(1.7);
    expect(corruptionPricedHr(socketed, 1.17, undefined)).toBeNull();
  });
});

function character(overrides: Partial<CharacterDetail> = {}): CharacterDetail {
  return {
    name: 'TO',
    season: getCurrentSeason()!.id,
    mode: 'softcore',
    className: 'Necromancer',
    level: 90,
    life: 1000,
    mana: 500,
    attributes: { strength: 100, dexterity: 50, vitality: 300, energy: 50 },
    isDead: false,
    skills: [],
    equipped: [
      item(),
      item({ slot: 'Helm', key: 'unique:giant_skull', name: 'Giant Skull', corrupted: false, priceHr: 1.14 }),
    ],
    merc: null,
    charms: [],
    gearValueHr: 1.22,
    firstSeenAt: '2026-11-01T00:00:00.000Z',
    lastUpdated: '2026-11-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('applyCorruptionPrices', () => {
  it('reprices the items and moves the gear value by the difference', () => {
    const detail = character();
    const valued = applyCorruptionPrices(detail, new Map([[detail.equipped[0], 1.17]]));
    expect(valued.equipped[0]).toMatchObject({ priceHr: 1.17, corruptionPriced: true });
    expect(valued.equipped[1]).toBe(detail.equipped[1]);
    expect(valued.gearValueHr).toBe(2.31);
  });

  it('counts merc gear but not charms in the gear value', () => {
    const mercItem = item({ slot: 'Helm', priceHr: null });
    const charm = { ...item({ slot: 'Inventory', priceHr: 0.1 }), row: 0, column: 0, height: 1 as const };
    const detail = character({
      equipped: [],
      merc: { type: 'Prayer', typeId: 1, name: 'Merc', equipped: [mercItem] },
      charms: [charm],
      gearValueHr: null,
    });
    const valued = applyCorruptionPrices(
      detail,
      new Map([
        [mercItem, 0.5],
        [charm, 0.4],
      ]),
    );
    expect(valued.merc?.equipped[0].priceHr).toBe(0.5);
    expect(valued.charms?.[0]).toMatchObject({ priceHr: 0.4, corruptionPriced: true });
    expect(valued.gearValueHr).toBe(0.5);
  });
});

describe('useCorruptionPrices', () => {
  beforeEach(() => clearCorruptionValueCache());
  afterEach(() => {
    fetchMock.mockReset();
    plainPricesMock.mockReset();
  });

  it('shows the API prices, then the corruption prices', async () => {
    fetchMock.mockImplementation(async () => priceCheckReply([listing(1), listing(1.2), listing(1.4)]));
    const detail = character();
    const { result } = renderHook(() => useCorruptionPrices(detail));
    expect(result.current).toBe(detail);
    await waitFor(() => expect(result.current?.equipped[0].priceHr).toBe(1.2));
    expect(result.current?.gearValueHr).toBe(2.34);
    // Nothing socketed: no plain prices needed
    expect(plainPricesMock).not.toHaveBeenCalled();
  });

  it('separates socketed items with the plain item price', async () => {
    fetchMock.mockImplementation(async () => priceCheckReply([listing(1), listing(1), listing(1)]));
    plainPricesMock.mockResolvedValue(
      new Map([
        ['blackhand_key', { movingAverage7Days: 0.08, medianPrice: 0.07, sampleCount: 96 } as AveragePriceResponse],
      ]),
    );
    const detail = character({
      equipped: [item({ priceHr: 0.28, socketed: [{ key: 'rune:r22', name: 'Um Rune', quality: null, mods: [] }] })],
      gearValueHr: 0.28,
    });
    const { result } = renderHook(() => useCorruptionPrices(detail));
    await waitFor(() => expect(result.current?.equipped[0].priceHr).toBe(1.2));
    expect(plainPricesMock).toHaveBeenCalledWith([{ baseCode: 'blackhand_key' }], {
      isLadder: true,
      isHardcore: false,
      startDate: getCurrentSeason()!.startDate,
      hours: 168,
    });
  });

  it('leaves other seasons alone', () => {
    const detail = character({ season: 's1' });
    // renderHook runs the effect inside act: another season returns before any request
    const { result } = renderHook(() => useCorruptionPrices(detail));
    expect(result.current).toBe(detail);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
