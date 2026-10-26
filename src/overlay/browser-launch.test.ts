import { describe, expect, it } from 'vitest';
import { browserLaunchFromUrl } from './browser-launch';

const IDS = ['market', 'settings', 'chat', 'builds'];
const at = (href: string) => new URL(href, 'http://127.0.0.1:1431');

describe('browserLaunchFromUrl', () => {
  it('opens the market from the /market path, with or without a trailing slash', () => {
    expect(browserLaunchFromUrl(at('/market'), IDS)).toEqual({ id: 'market', payload: undefined });
    expect(browserLaunchFromUrl(at('/market/'), IDS)?.id).toBe('market');
  });

  it('pre-fills the market item name from ?item=', () => {
    expect(browserLaunchFromUrl(at('/market?item=Windforce'), IDS)).toEqual({
      id: 'market',
      payload: { filters: { itemName: 'Windforce' } },
    });
    expect(browserLaunchFromUrl(at('/?panel=market&item=%20%20'), IDS)?.payload).toBeUndefined();
  });

  it('opens the builds panel from /builds or ?panel=builds, on ?character= when given', () => {
    expect(browserLaunchFromUrl(at('/builds/'), IDS)).toEqual({ id: 'builds', payload: undefined });
    expect(browserLaunchFromUrl(at('/?panel=builds&character=%20Hammer%20Time%20'), IDS)).toEqual({
      id: 'builds',
      payload: { character: { name: 'Hammer Time' } },
    });
  });

  it('?panel= wins over the path and opens any registered panel', () => {
    expect(browserLaunchFromUrl(at('/market?panel=settings'), IDS)).toEqual({ id: 'settings' });
  });

  it('ignores the root path and unknown panel ids', () => {
    expect(browserLaunchFromUrl(at('/'), IDS)).toBeNull();
    expect(browserLaunchFromUrl(at('/?panel=nope'), IDS)).toBeNull();
    expect(browserLaunchFromUrl(at('/overlay'), IDS)).toBeNull();
  });
});
