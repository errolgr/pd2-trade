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
        marketDefaultMaxAgeDays: 30,
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

  it("falls back to the site's defaults for missing or stale values", () => {
    expect(searchDefaults({})).toEqual(SITE_SEARCH_DEFAULTS);
    const stale = {
      marketDefaultSort: 'score',
      marketDefaultSeller: 'offline',
      marketDefaultHasBuyout: 'maybe',
      marketDefaultMaxAgeDays: 0,
    } as unknown as SearchDefaultSettings;
    expect(searchDefaults(stale)).toEqual(SITE_SEARCH_DEFAULTS);
    expect(searchDefaults({ marketDefaultMaxAgeDays: 2.5 }).maxAgeDays).toBe(3);
    expect(searchDefaults({ marketDefaultMaxAgeDays: 366 }).maxAgeDays).toBe(3);
  });
});

describe('withSource', () => {
  it("moves an age window at the user's live default to the archive's 14 days and back", () => {
    const defaults = searchDefaults({ marketDefaultMaxAgeDays: 7 });
    const archive = withSource(defaultFilters(mode, defaults), 'archive', defaults);
    expect(archive.maxAgeDays).toBe(14);
    expect(withSource(archive, 'live', defaults).maxAgeDays).toBe(7);
    // A window the user picked stays
    expect(withSource({ ...defaultFilters(mode, defaults), maxAgeDays: 30 }, 'archive', defaults).maxAgeDays).toBe(30);
  });
});
