import { describe, expect, it } from 'vitest';
import { isNetworkError } from './network-errors';

describe('isNetworkError', () => {
  it.each([
    'error sending request for url (https://github.com/errolgr/pd2-trade/releases/latest/download/latest.json)',
    'error sending request for url (https://pd2trader.com/api/auth/oauth/me)',
    'error decoding response body',
    'Could not fetch a valid release JSON from the remote',
    'Download request failed with status: 403 Forbidden',
    'Download request failed with status: 429 Too Many Requests',
    'Download request failed with status: 502 Bad Gateway',
  ])('treats %s (as the plugins reject it: a string) as a network failure', (message) => {
    expect(isNetworkError(message)).toBe(true);
    expect(isNetworkError(new Error(message))).toBe(true);
  });

  it.each([
    // A release published without its installer is our bug
    'Download request failed with status: 404 Not Found',
    'failed to unpack `PD2 Trader.exe`',
    'API Error: 500 Internal Server Error',
    'Permission denied (os error 13)',
  ])('keeps %s an error', (message) => {
    expect(isNetworkError(message)).toBe(false);
  });

  it('handles non-string rejections', () => {
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError({ code: 1 })).toBe(false);
  });
});
