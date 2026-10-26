import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBuildUsage, type ItemUsage, type UsageResponse } from '@/lib/builds-api';
import { clearBuildUsageCache, findItemUsage, loadBuildUsage } from './build-usage';

vi.mock('@/lib/builds-api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getBuildUsage: vi.fn(),
}));

const usage = (name: string, quality: string): ItemUsage => ({
  key: `${quality.toLowerCase()}:${name}`,
  name,
  quality,
  iconUrl: null,
  count: 10,
  pct: 1,
  priceHr: null,
});

const ITEMS = [
  usage('Harlequin Crest', 'Unique'),
  usage('Spirit', 'Runeword'),
  usage("Tal Rasha's Adjudication", 'Set'),
  usage('Insight', 'Unique'), // same name, other quality
];

describe('findItemUsage', () => {
  it('matches uniques and sets by name in any case and their quality', () => {
    expect(findItemUsage(ITEMS, { name: 'harlequin crest', quality: 'Unique' })?.name).toBe('Harlequin Crest');
    expect(findItemUsage(ITEMS, { name: "Tal Rasha's Adjudication", quality: 'Set' })?.quality).toBe('Set');
    expect(findItemUsage(ITEMS, { name: 'Harlequin Crest', quality: 'Set' })).toBeNull();
  });

  it('matches runewords as Runeword whatever the base quality', () => {
    expect(findItemUsage(ITEMS, { name: 'Spirit', quality: 'Superior', isRuneword: true })?.key).toBe(
      'runeword:Spirit',
    );
    expect(findItemUsage(ITEMS, { name: 'Insight', quality: 'Normal', isRuneword: true })).toBeNull();
  });

  it('never matches other qualities or a missing name', () => {
    expect(findItemUsage([usage('Ring', 'Rare')], { name: 'Ring', quality: 'Rare' })).toBeNull();
    expect(findItemUsage(ITEMS, { name: undefined, quality: 'Unique' })).toBeNull();
  });
});

describe('loadBuildUsage', () => {
  afterEach(() => {
    clearBuildUsageCache();
    vi.mocked(getBuildUsage).mockReset();
  });

  const response = { total: 3000, items: ITEMS } as UsageResponse;

  it('fetches each mode once per 30 minutes', async () => {
    vi.mocked(getBuildUsage).mockResolvedValue(response);
    await loadBuildUsage('softcore', 0);
    await loadBuildUsage('softcore', 29 * 60_000);
    expect(getBuildUsage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getBuildUsage).mock.calls[0][0]).toMatchObject({ mode: 'softcore', items: [] });

    await loadBuildUsage('hardcore', 0);
    await loadBuildUsage('softcore', 31 * 60_000);
    expect(getBuildUsage).toHaveBeenCalledTimes(3);
  });

  it('resolves null when the service fails, and tries again next time', async () => {
    vi.mocked(getBuildUsage).mockRejectedValueOnce(new Error('down')).mockResolvedValue(response);
    expect(await loadBuildUsage('softcore', 0)).toBeNull();
    expect(await loadBuildUsage('softcore', 1)).toEqual({ total: 3000, items: ITEMS });
  });
});
