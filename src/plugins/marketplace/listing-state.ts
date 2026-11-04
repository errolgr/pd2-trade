import type { InstalledPlugin } from '../host/types';
import type { BlocklistEntry, Listing } from './api';
import { isBlocked } from './install';
import { hasUpdate } from './updates';

export type ListingState =
  | { kind: 'install' }
  | { kind: 'unavailable' }
  | { kind: 'installed' }
  | { kind: 'update'; version: string }
  | { kind: 'blocked'; reason: string };

/**
 * What a marketplace listing's action shows, given the installed copy (if any) and the signed blocklist:
 * blocked (installed version or the latest is listed), update available, installed, installable, or
 * unavailable (no approved version yet).
 */
export function listingState(
  listing: Pick<Listing, 'id' | 'latestVersion'>,
  installed: Pick<InstalledPlugin, 'version' | 'disabledReason'> | undefined,
  blocklist: readonly BlocklistEntry[],
): ListingState {
  const latest = listing.latestVersion;
  const latestBlock = latest ? isBlocked(blocklist, listing.id, latest) : undefined;
  if (!installed) {
    if (!latest) return { kind: 'unavailable' };
    return latestBlock ? { kind: 'blocked', reason: latestBlock.reason } : { kind: 'install' };
  }
  if (hasUpdate(installed.version, latest) && !latestBlock) return { kind: 'update', version: latest };
  const installedBlock = isBlocked(blocklist, listing.id, installed.version);
  if (installedBlock || installed.disabledReason === 'blocklisted')
    return { kind: 'blocked', reason: installedBlock?.reason ?? '' };
  return { kind: 'installed' };
}
