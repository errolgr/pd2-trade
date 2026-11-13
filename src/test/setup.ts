import { afterEach } from 'vitest';

// Tests never reach the network: an unmocked fetch of a real server, the dev server (`/src/assets/…`) or any
// other URL a webview would load over the network is refused, and the test that made it fails even when the
// caller swallows the error. Tests that need fetch stub it (vi.stubGlobal('fetch', …)); data: and blob: pass.
const realFetch = globalThis.fetch;
const refused: string[] = [];

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

if (realFetch) {
  globalThis.fetch = (input, init) => {
    const url = requestUrl(input);
    if (!/^(data|blob):/i.test(url)) {
      refused.push(url);
      return Promise.reject(new Error(`Unmocked fetch in a test: ${url} (mock the API or stub fetch)`));
    }
    return realFetch(input, init);
  };
}

afterEach(() => {
  if (refused.length === 0) return;
  const urls = refused.splice(0);
  throw new Error(`Unmocked fetch in this test (mock the API or stub fetch):\n${urls.join('\n')}`);
});
