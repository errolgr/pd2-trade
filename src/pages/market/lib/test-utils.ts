import type { MarketListingEntry, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';

/** `[name, ...values]` → Modifier. */
export const mod = (name: string, ...values: number[]): Modifier => ({ name, values, label: name, priority: 0 });

let seq = 0;

/** A minimal listing for lib tests: id, mods, HR price, bump time. */
export function listing(
  over: { id?: string; mods?: Modifier[]; hr?: number; bumpedAt?: string; price?: string; name?: string } = {},
): MarketListingEntry {
  const id = over.id ?? `L${++seq}`;
  return {
    _id: id,
    user_id: 'seller-1',
    type: 'item',
    is_hardcore: false,
    is_ladder: true,
    price: over.price ?? '',
    hr_price: over.hr,
    bumped_at: over.bumpedAt ?? '2026-10-18T11:00:00.000Z',
    updated_at: over.bumpedAt ?? '2026-10-18T11:00:00.000Z',
    created_at: '2026-10-17T00:00:00.000Z',
    created_by_id: 'seller-1',
    updated_by_id: 'seller-1',
    item: {
      name: over.name ?? 'Amulet',
      base: { name: 'Amulet', type_code: 'amul' },
      quality: { id: 6, name: 'Rare' },
      modifiers: over.mods ?? [],
      account_id: 'selleracc',
    },
    user: { _id: 'seller-1', username: 'Seller', game: { accounts: ['selleracc'] } },
  } as unknown as MarketListingEntry;
}
