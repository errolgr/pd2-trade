import { compareVersions, isValidVersion } from '@pd2-trader/plugin-sdk';
import type { ListingVersion, PermissionChanges } from './api';

/**
 * Update view-model for the Plugins panel (PRD §7.3): is a newer version out, what changed in access between the
 * installed copy and the latest version, and which changelogs the user skips over.
 */

/** latest > installed by semver. Missing or malformed versions never read as an update. */
export function hasUpdate(installed: string | null | undefined, latest: string | null | undefined): boolean {
  if (!installed || !latest || !isValidVersion(installed) || !isValidVersion(latest)) return false;
  return compareVersions(latest, installed) > 0;
}

/** Versions in (installed, latest], newest first: the changelogs an update applies. */
export function versionsBetween(
  versions: readonly ListingVersion[],
  installed: string,
  latest: string,
): ListingVersion[] {
  return versions
    .filter(
      (v) =>
        isValidVersion(v.version) &&
        compareVersions(v.version, installed) > 0 &&
        compareVersions(v.version, latest) <= 0,
    )
    .sort((a, b) => compareVersions(b.version, a.version));
}

interface Access {
  permissions: readonly string[];
  network: readonly string[];
}

/**
 * Cumulative access change from the installed manifest to the target version (one diff over every skipped
 * version, so a permission added in 1.1 and dropped again in 1.2 does not show).
 */
export function accessDiff(from: Access, to: Access): PermissionChanges {
  const added = (a: readonly string[], b: readonly string[]) =>
    b.filter((x, i) => !a.includes(x) && b.indexOf(x) === i);
  return {
    permissionsAdded: added(from.permissions, to.permissions),
    permissionsRemoved: added(to.permissions, from.permissions),
    hostsAdded: added(from.network, to.network),
    hostsRemoved: added(to.network, from.network),
  };
}

/** Updates that ask for a new permission or host are held until the user consents again. */
export function needsReconsent(diff: PermissionChanges): boolean {
  return diff.permissionsAdded.length > 0 || diff.hostsAdded.length > 0;
}
