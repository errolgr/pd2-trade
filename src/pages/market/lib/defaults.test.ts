import { describe, expect, it } from 'vitest';
import { defaultFilters, SITE_SEARCH_DEFAULTS, searchDefaults, withSource } from './defaults';
import type { SearchDefaultSettings } from './defaults';

const mode = { hardcore: false, ladder: true };

describe('searchDefaults', () => {
  it('maps the settings onto a fresh search', () => {
    const f = defaultFilters(
      mode,
      searchDefaults({
        marketDefaultSort: 'priciest',
        marketDefaultSeller: 'online',
        marketDefaultHasBuyout: 'no',
        marketDefaultListedWithinDays: 30,
      }),
    );
    expect(f).toMatchObject({
      sort: { by: 'price', dir: 'desc' },
      userOnlineSite: 'online',
      userOnlineGame: 'all',
      hasBuyout: 'no',
      maxAgeDays: 30,
    });
  });

  it('falls back to the defaults (no age window) for missing, Any or stale values', () => {
    expect(searchDefaults({})).toEqual(SITE_SEARCH_DEFAULTS);
    expect(defaultFilters(mode)).not.toHaveProperty('maxAgeDays');
    const stale = {
      marketDefaultSort: 'score',
      marketDefaultSeller: 'offline',
      marketDefaultHasBuyout: 'maybe',
      marketDefaultListedWithinDays: 0,
    } as unknown as SearchDefaultSettings;
    expect(searchDefaults(stale)).toEqual(SITE_SEARCH_DEFAULTS);
    expect(searchDefaults({ marketDefaultListedWithinDays: 2.5 }).maxAgeDays).toBeUndefined();
    expect(searchDefaults({ marketDefaultListedWithinDays: 366 }).maxAgeDays).toBeUndefined();
  });
});

describe('withSource', () => {
  it("drops an age window at the user's live default on the way to the archive (no window) and brings it back", () => {
    const defaults = searchDefaults({ marketDefaultListedWithinDays: 7 });
    const archive = withSource(defaultFilters(mode, defaults), 'archive', defaults);
    expect(archive.maxAgeDays).toBeUndefined();
    expect(withSource(archive, 'live', defaults).maxAgeDays).toBe(7);
    // A window the user picked stays
    expect(withSource({ ...defaultFilters(mode, defaults), maxAgeDays: 30 }, 'archive', defaults).maxAgeDays).toBe(30);
  });

  it("drops the archive's status pick on the way to live listings", () => {
    const archive = { ...withSource(defaultFilters(mode), 'archive'), status: ['sold' as const] };
    expect(withSource(archive, 'live').status).toBeUndefined();
  });
});
