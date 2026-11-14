// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { fetch as browserFetch } from '@/lib/browser-http';
import type { CharacterDetail, PricedEquippedItem, SocketedItem } from '@/lib/builds-api';
import { getCurrentSeason } from '@/lib/seasons';
import { clearRareEstimates } from '@/pages/market/enrich/rare-estimates';
import { buildItemClipboard, ownModLines, rareRequestsOf, useRarePrices } from './rare-value';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));

const fetchMock = vi.mocked(browserFetch);

const UM: SocketedItem = { key: 'rune:r22', name: 'Um', quality: null, mods: ['All Resistances +15%'] };
const MAGIC_JEWEL: SocketedItem = {
  key: 'base:jew:magic',
  name: 'Scintillating Jewel of Hope',
  quality: 'Magic',
  mods: ['+19 to Life', 'All Resistances +12%'],
};
const RARE_JEWEL: SocketedItem = {
  key: 'base:jew:rare',
  name: 'Storm Eye',
  quality: 'Rare',
  mods: ['15% Increased Attack Speed', '+35% Enhanced Damage', 'Fire Resist 30%'],
};

/** TO's helm (live build): its All Resistances line has the Um's +15% folded in. */
function diadem(overrides: Partial<PricedEquippedItem> = {}): PricedEquippedItem {
  return {
    slot: 'Helm',
    key: 'base:ci3:rare',
    name: 'Diadem',
    quality: 'Rare',
    base: 'Diadem',
    baseCode: 'ci3',
    runeword: false,
    ethereal: false,
    corrupted: true,
    sockets: 1,
    socketed: [UM],
    mods: [
      'Corrupted',
      '+2 to Necromancer Skills',
      '10% Faster Cast Rate',
      '+104 to Attack Rating',
      'All Resistances +34%',
      'Physical Damage Taken Reduced by 5%',
    ],
    rolls: [null, null, null, [104, 101, 120], [34, 16, 20], null],
    corruptedMods: ['Physical Damage Taken Reduced by 5%'],
    itemLevel: 90,
    iconUrl: null,
    priceHr: 0.13,
    ...overrides,
  };
}

describe('ownModLines', () => {
  it("takes what the sockets add back out of the item's lines", () => {
    const item = diadem();
    expect(ownModLines(item.mods, item.rolls, item.socketed)).toContainEqual({
      line: 'All Resistances +19%',
      roll: [19, 16, 20],
    });
  });

  it('drops a line the sockets alone make', () => {
    expect(ownModLines(['+19 to Life', '+5 to Strength'], undefined, [{ mods: ['+19 to Life'] }])).toEqual([
      { line: '+5 to Strength', roll: null },
    ]);
  });
});

describe('buildItemClipboard', () => {
  it('writes a worn rare as the clipboard item the appraisal parses', () => {
    expect(buildItemClipboard(diadem())).toEqual({
      name: 'Diadem',
      quality: 'Rare',
      type: 'Diadem',
      iLevel: 90,
      sockets: 1,
      isEthereal: false,
      stats: [
        { stat_id: 360, name: 'Corrupted' },
        { name: '+%d to Necromancer Skills', value: 2 },
        { name: '%d%% Faster Cast Rate', value: 10 },
        { name: '+%d to Attack Rating', value: 104, range: { min: 101, max: 120 } },
        { name: 'All Resistances +%d%%', value: 19, range: { min: 16, max: 20 } },
        { name: 'Physical Damage Taken Reduced by %d%%', value: 5, corrupted: true },
      ],
    });
  });

  it('leaves out magic, unique and set items', () => {
    expect(buildItemClipboard(diadem({ quality: 'Magic' }))).toBeNull();
    expect(buildItemClipboard(diadem({ quality: 'Unique' }))).toBeNull();
  });
});

function character(equipped: PricedEquippedItem[], overrides: Partial<CharacterDetail> = {}): CharacterDetail {
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
    equipped,
    merc: null,
    charms: [],
    gearValueHr: equipped.reduce((sum, item) => sum + (item.priceHr ?? 0), 0),
    firstSeenAt: '2026-11-01T00:00:00.000Z',
    lastUpdated: '2026-11-14T00:00:00.000Z',
    ...overrides,
  };
}

const blackhandKey = (socketed: SocketedItem[]): PricedEquippedItem => ({
  ...diadem(),
  slot: 'Right Hand',
  key: 'unique:blackhand_key',
  name: 'Blackhand Key',
  quality: 'Unique',
  base: 'Grave Wand',
  corrupted: false,
  corruptedMods: undefined,
  socketed,
  sockets: socketed.length,
  priceHr: 0.08,
});

describe('rareRequestsOf', () => {
  it('appraises rare gear and socketed rare jewels, not magic ones', () => {
    const helm = diadem();
    const wand = blackhandKey([MAGIC_JEWEL, RARE_JEWEL]);
    const requests = rareRequestsOf(character([helm, wand]), 'L|SC');
    expect(requests.get(helm)?.own?.key).toMatch(/^L\|SC\|\{"name":"Diadem"/);
    expect(requests.get(helm)?.jewels).toEqual([]);
    expect(requests.get(wand)?.own).toBeNull();
    expect(requests.get(wand)?.jewels.map((j) => JSON.parse(j.text).name)).toEqual(['Storm Eye']);
  });

  it('skips items with nothing to appraise', () => {
    expect(rareRequestsOf(character([blackhandKey([MAGIC_JEWEL])]), 'L|SC').size).toBe(0);
  });
});

/** A batch reply appraising each item at the given band (null: no appraisal; `low`: low confidence). */
function batchReply(bands: ({ lowHr: number; highHr: number; sampleSize?: number } | null)[]) {
  return new Response(
    JSON.stringify({
      results: bands.map((band, index) => ({
        index,
        reason: band ? null : 'unknown base',
        appraisal: band && {
          id: `id${index}`,
          market: { source: 'current', mode: 'softcore', sampleSize: 50, ...band },
        },
      })),
    }),
    { status: 200 },
  );
}

describe('useRarePrices', () => {
  beforeEach(() => clearRareEstimates());
  afterEach(() => {
    // Mounted hooks would re-request their (cleared) appraisals when the next test's batch lands
    cleanup();
    fetchMock.mockReset();
  });

  it('adds the appraisals in one batch: band midpoints, rare jewels too, and the gear value', async () => {
    fetchMock.mockImplementation(async () =>
      batchReply([
        { lowHr: 0.3, highHr: 0.5 },
        { lowHr: 1, highHr: 2 },
      ]),
    );
    const helm = diadem();
    const wand = blackhandKey([RARE_JEWEL]);
    const detail = character([helm, wand]);
    const { result } = renderHook(() => useRarePrices(detail));
    // The API prices until the appraisals arrive
    expect(result.current?.equipped[0].priceHr).toBe(0.13);
    await waitFor(() => expect(result.current?.equipped[0].priceHr).toBe(0.53));
    expect(result.current?.equipped[0].rareValue).toEqual({ band: { lowHr: 0.3, highHr: 0.5 } });
    expect(result.current?.equipped[1]).toMatchObject({ priceHr: 1.58, rareValue: { jewelsHr: 1.5 } });
    expect(result.current?.gearValueHr).toBe(2.11);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ isLadder: true, isHardcore: false });
    expect(body.items).toHaveLength(2);
  });

  it('shows no appraisal without a confident one', async () => {
    fetchMock.mockImplementation(async () => batchReply([null, { lowHr: 1, highHr: 2, sampleSize: 3 }]));
    const detail = character([diadem(), { ...diadem({ slot: 'Armor' }), name: 'Chain Mail', base: 'Chain Mail' }]);
    const { result } = renderHook(() => useRarePrices(detail));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current?.equipped[0]).toBe(detail.equipped[0]));
    expect(result.current?.equipped[1]).toBe(detail.equipped[1]);
    expect(result.current?.gearValueHr).toBe(detail.gearValueHr);
  });

  it('leaves other seasons alone', () => {
    const detail = character([diadem()], { season: 's1' });
    const { result } = renderHook(() => useRarePrices(detail));
    expect(result.current?.equipped[0]).toBe(detail.equipped[0]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
