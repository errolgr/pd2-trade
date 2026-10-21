import { describe, expect, it } from 'vitest';
import type { ItemDetail, MarketListingEntry, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { isAppraisable, listingClipboardItem, modifierStat, rareRequest, realmKey } from './listing-clipboard';

const mod = (name: string, label: string, values: number[] = [], extra: Partial<Modifier> = {}): Modifier => ({
  name,
  label,
  values,
  priority: 0,
  ...extra,
});

function item(extra: Partial<ItemDetail> = {}): ItemDetail {
  return {
    name: 'Doom Coil',
    quality: { id: 6, name: 'Rare' },
    base: { name: 'Circlet', type_code: 'circ' },
    is_identified: true,
    is_ethereal: false,
    item_level: 87,
    socket_count: 0,
    corrupted: false,
    modifiers: [
      mod('item_fastercastrate', '+20% Faster Cast Rate', [20]),
      mod('fireresist', 'Fire Resist +30%', [30]),
      mod('firemindam', 'Adds 3-7 Fire Damage', [3, 7]),
      mod('item_charged_skill', 'Level 3 Teleport (12/12 Charges)', [3, 12, 12]),
      mod('item_cannotbefrozen', 'Cannot Be Frozen'),
    ],
    ...extra,
  } as unknown as ItemDetail;
}

function listing(itemDetail: ItemDetail, extra: Partial<MarketListingEntry> = {}): MarketListingEntry {
  return {
    _id: 'l1',
    user_id: 'u1',
    is_ladder: true,
    is_hardcore: false,
    hr_price: 1,
    item: itemDetail,
    ...extra,
  } as unknown as MarketListingEntry;
}

describe('modifierStat', () => {
  it('turns label numbers into printf tokens filled in chance/level/value order, escaping literal %', () => {
    expect(modifierStat(mod('item_fastercastrate', '+20% Faster Cast Rate'))).toEqual({
      name: '+%d%% Faster Cast Rate',
      value: 20,
      stat_id: 105,
    });
    expect(modifierStat(mod('x', 'Adds 3-7 Fire Damage'))).toEqual({
      name: 'Adds %d-%d Fire Damage',
      chance: 3,
      value: 7,
    });
    expect(modifierStat(mod('x', 'Level 3 Teleport (12/12 Charges)'))).toEqual({
      name: 'Level %d Teleport (%d/%d Charges)',
      chance: 3,
      level: 12,
      value: 12,
    });
    expect(modifierStat(mod('x', 'Cannot Be Frozen'))).toEqual({ name: 'Cannot Be Frozen' });
    expect(modifierStat(mod('x', '+1.5 Life per Level'))).toEqual({ name: '+%d Life per Level', value: 1.5 });
  });

  it('never sends ids the server parser treats specially (resists, damage pairs, skills, charges)', () => {
    expect(modifierStat(mod('fireresist', 'Fire Resist +30%'))).not.toHaveProperty('stat_id');
  });

  it('marks corrupted stats and drops labels with more numbers than a stat holds', () => {
    expect(modifierStat(mod('x', '+5 to Strength', [5], { corrupted: true }))).toMatchObject({ corrupted: true });
    expect(modifierStat(mod('x', '1 2 3 4'))).toBeNull();
    expect(modifierStat(mod('x', '  '))).toBeNull();
  });
});

describe('listingClipboardItem', () => {
  it('builds the clipboard item the appraisal parses', () => {
    const clip = listingClipboardItem(item({ socket_count: 2, is_ethereal: true }));
    expect(clip).toMatchObject({
      name: 'Doom Coil',
      quality: 'Rare',
      type: 'Circlet',
      iLevel: 87,
      sockets: 2,
      isEthereal: true,
    });
    expect(clip?.stats).toHaveLength(5);
  });

  it('sends corruption as stat 360 (+ the outcome as 361) and sockets as the item field, not as lines', () => {
    const clip = listingClipboardItem(
      item({
        modifiers: [
          mod('corrupted', 'Corrupted', [0, 4]),
          mod('item_numsockets', 'Socketed (2)', [2]),
          mod('item_fastercastrate', '+20% Faster Cast Rate', [20]),
        ],
      }),
    );
    expect(clip?.stats).toEqual([
      { stat_id: 360, name: 'Corrupted' },
      { stat_id: 361, name: 'Corruptor', value: 4 },
      { name: '+%d%% Faster Cast Rate', value: 20, stat_id: 105 },
    ]);
  });

  it('covers identified rare and crafted items only', () => {
    expect(isAppraisable(item())).toBe(true);
    expect(listingClipboardItem(item({ quality: { id: 8, name: 'Crafted' } }))?.quality).toBe('Crafted');
    expect(listingClipboardItem(item({ quality: { id: 7, name: 'Unique' } }))).toBeNull();
    expect(listingClipboardItem(item({ is_identified: false }))).toBeNull();
  });
});

describe('rareRequest', () => {
  it('keys by realm and item content, not by listing', () => {
    const a = rareRequest(listing(item(), { _id: 'a', user_id: 'u1' }));
    const b = rareRequest(listing(item(), { _id: 'b', user_id: 'u2' }));
    expect(a).not.toBeNull();
    expect(a?.key).toBe(b?.key);
    expect(a?.realm).toBe('L|SC');
    expect(JSON.parse(a!.text)).toEqual(listingClipboardItem(item()));

    const hc = rareRequest(listing(item(), { is_hardcore: true }));
    expect(hc?.key).not.toBe(a?.key);
    const other = rareRequest(listing(item({ name: 'Grim Crown' })));
    expect(other?.key).not.toBe(a?.key);
  });

  it('is null for items the appraisal does not cover', () => {
    expect(rareRequest(listing(item({ quality: { id: 7, name: 'Unique' } })))).toBeNull();
  });

  it('realmKey reflects ladder and hardcore', () => {
    expect(realmKey({ is_ladder: false, is_hardcore: true })).toBe('NL|HC');
  });
});
