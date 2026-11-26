import { describe, expect, it } from 'vitest';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { isMissing, stashPresence } from './stash-presence';

const item = (hash: string, storage = 'Shared Stash', roll = 2) =>
  ({
    hash,
    base_code: 'uap',
    quality: { name: 'Unique' },
    item_level: 85,
    socket_count: 0,
    modifiers: [{ name: 'item_allskills', values: [roll] }],
    location: { storage, stash_page: 3 },
  }) as unknown as GameStashItem;

const listing = (id: string, hash: string, roll = 2) =>
  ({ _id: id, item: { ...item(hash, 'Shared Stash', roll) } }) as unknown as MarketListingEntry;

const states = (presence: Map<string, { state: string }>) =>
  Object.fromEntries([...presence].map(([id, p]) => [id, p.state]));

describe('stashPresence', () => {
  it('shows where an item is now, whether or not it moved since it was listed, and tells one gone', () => {
    const presence = stashPresence(
      [listing('here', 'h1'), listing('moved', 'h2', 3), listing('gone', 'h3', 4)],
      [item('h1'), item('h9', 'Stash', 3), item('h3', 'Inventory', 4)],
    );
    expect(states(presence)).toEqual({ here: 'found', moved: 'found', gone: 'missing' });
    expect(presence.get('moved')).toMatchObject({ places: [{ hash: 'h9' }] });
  });

  it('does not let a moved listing claim the stash item an unmoved look-alike is', () => {
    const presence = stashPresence([listing('a', 'h1'), listing('b', 'h2')], [item('h1')]);
    expect(states(presence)).toEqual({ a: 'found', b: 'missing' });
  });

  it('is unsure when identical listings outnumber identical stash items', () => {
    const presence = stashPresence([listing('a', 'x1'), listing('b', 'x2')], [item('h5')]);
    expect(states(presence)).toEqual({ a: 'unsure', b: 'unsure' });
    expect(presence.get('a')).toMatchObject({ listed: 2, places: [{ hash: 'h5' }] });
    expect(isMissing(presence.get('a'))).toBe(true);
    expect(isMissing(undefined)).toBe(false);
  });
});
