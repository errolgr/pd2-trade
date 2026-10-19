// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { fetch } from './browser-http';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }));

let windowFetch: Mock;

beforeEach(() => {
  tauri.value = false;
  windowFetch = vi.fn().mockResolvedValue(new Response('ok'));
  vi.spyOn(window, 'fetch').mockImplementation(windowFetch);
});

describe('browser mode', () => {
  it.each([
    ['string', 'https://api.projectdiablo2.com/market/listing?q=1'],
    ['URL', new URL('https://api.projectdiablo2.com/market/listing?q=1')],
    ['Request', new Request('https://api.projectdiablo2.com/market/listing?q=1')],
  ])('rewrites a PD2 API %s to the dev proxy path', async (_kind, input) => {
    await fetch(input as RequestInfo | URL);

    expect(windowFetch.mock.calls[0][0]).toBe('/api/market/listing?q=1');
  });

  it('passes non-PD2 URLs through unchanged with the given init', async () => {
    const init = { method: 'POST', body: '{}' };

    await fetch('https://pd2trader.com/item-prices', init);

    expect(windowFetch).toHaveBeenCalledWith('https://pd2trader.com/item-prices', init);
    expect(tauriFetch).not.toHaveBeenCalled();
  });
});

describe('Tauri mode', () => {
  it('uses the HTTP plugin with the original, un-proxied URL', async () => {
    tauri.value = true;
    const response = new Response('ok');
    vi.mocked(tauriFetch).mockResolvedValue(response);

    const result = await fetch('https://api.projectdiablo2.com/market/listing');

    expect(result).toBe(response);
    expect(vi.mocked(tauriFetch).mock.calls[0][0]).toBe('https://api.projectdiablo2.com/market/listing');
    expect(windowFetch).not.toHaveBeenCalled();
  });
});
