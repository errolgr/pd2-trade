import { compareVersions } from '@pd2-trader/plugin-sdk';
import type { InstalledPlugin } from '../host/types';
import type { BlocklistEntry, Listing } from './api';
import { isBlocked } from './install';

export type ListingState =
  | { kind: 'install' }
  | { kind: 'installed' }
  | { kind: 'update'; version: string }
  | { kind: 'blocked'; reason: string };

/**
 * What a marketplace listing's action shows, given the installed copy (if any) and the signed blocklist:
 * blocked (installed version or the latest is listed), update available, installed, or installable.
 */
export function listingState(
  listing: Pick<Listing, 'id' | 'latestVersion'>,
  installed: Pick<InstalledPlugin, 'version' | 'disabledReason'> | undefined,
  blocklist: readonly BlocklistEntry[],
): ListingState {
  const latestBlock = isBlocked(blocklist, listing.id, listing.latestVersion);
  if (!installed) return latestBlock ? { kind: 'blocked', reason: latestBlock.reason } : { kind: 'install' };
  const newer = compareVersions(listing.latestVersion, installed.version) > 0;
  if (newer && !latestBlock) return { kind: 'update', version: listing.latestVersion };
  const installedBlock = isBlocked(blocklist, listing.id, installed.version);
  if (installedBlock || installed.disabledReason === 'blocklisted')
    return { kind: 'blocked', reason: installedBlock?.reason ?? '' };
  return { kind: 'installed' };
}
