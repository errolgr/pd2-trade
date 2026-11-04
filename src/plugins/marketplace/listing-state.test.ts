import { describe, expect, it } from 'vitest';
import { listingState } from './listing-state';

const listing = { id: 'com.example.ticker', latestVersion: '1.2.0' };
const block = (versions: '*' | string[]) => [{ id: listing.id, versions, reason: 'malware' }];

describe('listingState', () => {
  it('offers install when not installed, blocked when the latest version is listed', () => {
    expect(listingState(listing, undefined, [])).toEqual({ kind: 'install' });
    expect(listingState(listing, undefined, block(['1.2.0']))).toEqual({ kind: 'blocked', reason: 'malware' });
  });

  it('is unavailable without an approved version, installed when one is already installed', () => {
    const unpublished = { id: listing.id, latestVersion: null };
    expect(listingState(unpublished, undefined, [])).toEqual({ kind: 'unavailable' });
    expect(listingState(unpublished, { version: '1.0.0' }, [])).toEqual({ kind: 'installed' });
  });

  it('shows installed for the latest version and an update for an older one', () => {
    expect(listingState(listing, { version: '1.2.0' }, [])).toEqual({ kind: 'installed' });
    expect(listingState(listing, { version: '1.1.0' }, [])).toEqual({ kind: 'update', version: '1.2.0' });
  });

  it('offers the update for a blocked installed version, unless the update is blocked too', () => {
    expect(listingState(listing, { version: '1.1.0', disabledReason: 'blocklisted' }, block(['1.1.0']))).toEqual({
      kind: 'update',
      version: '1.2.0',
    });
    expect(listingState(listing, { version: '1.1.0' }, block('*'))).toEqual({ kind: 'blocked', reason: 'malware' });
    expect(listingState(listing, { version: '1.2.0', disabledReason: 'blocklisted' }, [])).toEqual({
      kind: 'blocked',
      reason: '',
    });
  });
});
