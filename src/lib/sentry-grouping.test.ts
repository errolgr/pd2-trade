import { describe, expect, it } from 'vitest';
import { normalizeEndpoint, normalizeErrorText, pd2Fingerprint } from './sentry-grouping';

describe('normalizeEndpoint', () => {
  it('replaces ids, account names and query strings', () => {
    expect(normalizeEndpoint('/game/stash/FadedWOES')).toBe('/game/stash/:account');
    expect(normalizeEndpoint('/market/listing/6ae55b3f0f2682dea8c6b5d4')).toBe('/market/listing/:id');
    expect(normalizeEndpoint('/market/listing?user_id=6446d9b2b80f2f296a39989a&$limit=250')).toBe('/market/listing');
    expect(normalizeEndpoint('https://api.projectdiablo2.com/market/offer?user_id=1')).toBe(
      'https://api.projectdiablo2.com/market/offer',
    );
    expect(normalizeEndpoint('api/rares/appraisal')).toBe('api/rares/appraisal');
  });
});

describe('pd2Fingerprint', () => {
  it('collapses per-account and per-listing APIError titles', () => {
    const a = pd2Fingerprint('pd2-api 502 error on /game/stash/FadedWOES', 'APIError');
    const b = pd2Fingerprint('pd2-api 502 error on /game/stash/SomeoneElse', 'APIError');
    expect(a).toEqual(['api-error', 'pd2-api', 'status-502', '/game/stash/:account']);
    expect(b).toEqual(a);
    expect(pd2Fingerprint('pd2-api 502 error on /market/listing/6ae55b3f0f2682dea8c6b5d4', 'APIError')).toEqual(
      pd2Fingerprint('pd2-api 502 error on /market/listing/0123456789abcdef01234567', 'APIError'),
    );
  });

  it('groups PD2ApiError by status regardless of body or call site', () => {
    const a = pd2Fingerprint('API Error: 502 Bad Gateway\n<html>ray 1</html>', 'PD2ApiError');
    expect(a).toEqual(['pd2-api-error', 'status-502']);
    expect(pd2Fingerprint('Failed to load stash: API Error: 502 Bad Gateway')).toEqual(a);
    expect(pd2Fingerprint('API Error: 503 Service Unavailable', 'PD2ApiError')).toEqual(['pd2-api-error', 'status-503']);
  });

  it('groups transport failures per endpoint without user ids', () => {
    const msg = (id: string) =>
      `Failed to fetch incoming offers: error sending request for url (https://api.projectdiablo2.com/market/listing?$resolve[user][in_game_account]=true&user_id=${id}&$limit=250)`;
    const a = pd2Fingerprint(msg('6446d9b2b80f2f296a39989a'));
    expect(a).toEqual(['network-error', 'Failed to fetch incoming offers', 'https://api.projectdiablo2.com/market/listing']);
    expect(pd2Fingerprint(msg('6724bf18dd1812e4933d8a2a'))).toEqual(a);
    expect(normalizeErrorText(msg('6446d9b2b80f2f296a39989a'))).toBe(
      'Failed to fetch incoming offers: error sending request for url (https://api.projectdiablo2.com/market/listing)',
    );
  });

  it('leaves unrelated errors on default grouping', () => {
    expect(pd2Fingerprint('TypeError: x is undefined', 'TypeError')).toBeUndefined();
  });
});
