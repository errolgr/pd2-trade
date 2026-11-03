import { describe, expect, it } from 'vitest';
import { isPersonalStashLocation } from './personal-stash';

describe('isPersonalStashLocation', () => {
  it('is PD2\'s "Shared Stash" page 0 or a plain "Stash", never a shared page or another storage', () => {
    expect(isPersonalStashLocation({ storage: 'Shared Stash', stash_page: 0 })).toBe(true);
    expect(isPersonalStashLocation({ storage: 'Stash', stash_page: undefined as never })).toBe(true);
    expect(isPersonalStashLocation({ storage: 'Shared Stash', stash_page: 1 })).toBe(false);
    expect(isPersonalStashLocation({ storage: 'Shared Stash', stash_page: 9 })).toBe(false);
    expect(isPersonalStashLocation({ storage: 'Shared Stash', stash_page: undefined as never })).toBe(false);
    expect(isPersonalStashLocation({ storage: 'Inventory', stash_page: 0 })).toBe(false);
    expect(isPersonalStashLocation({ storage: 'Cube', stash_page: 0 })).toBe(false);
    expect(isPersonalStashLocation(null)).toBe(false);
  });
});
