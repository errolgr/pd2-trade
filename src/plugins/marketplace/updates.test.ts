import { describe, expect, it } from 'vitest';
import type { ListingVersion } from './api';
import { accessDiff, hasUpdate, needsReconsent, versionsBetween } from './updates';

const version = (v: string): ListingVersion => ({
  version: v,
  publishedAt: '2026-11-01T00:00:00Z',
  permissions: [],
  network: [],
  sdk: '^1.0.0',
  compatible: true,
  changelogHtml: `<p>${v}</p>`,
  changes: { permissionsAdded: [], permissionsRemoved: [], hostsAdded: [], hostsRemoved: [] },
});

describe('hasUpdate', () => {
  it('compares by semver, not as strings', () => {
    expect(hasUpdate('1.9.0', '1.10.0')).toBe(true);
    expect(hasUpdate('1.10.0', '1.9.0')).toBe(false);
    expect(hasUpdate('1.2.0', '1.2.0')).toBe(false);
  });

  it('treats a release as newer than its prerelease', () => {
    expect(hasUpdate('2.0.0-beta.2', '2.0.0')).toBe(true);
    expect(hasUpdate('2.0.0-beta.2', '2.0.0-beta.10')).toBe(true);
    expect(hasUpdate('2.0.0', '2.0.0-rc.1')).toBe(false);
  });

  it('never reports an update for a missing or malformed version', () => {
    expect(hasUpdate('1.0.0', null)).toBe(false);
    expect(hasUpdate(undefined, '1.0.0')).toBe(false);
    expect(hasUpdate('1.0', '1.1.0')).toBe(false);
    expect(hasUpdate('1.0.0', 'latest')).toBe(false);
  });
});

describe('versionsBetween', () => {
  const versions = ['1.3.0', '1.2.1', '1.10.0', '1.2.0', '1.1.0'].map(version);

  it('keeps versions after the installed one up to the latest, newest first', () => {
    expect(versionsBetween(versions, '1.2.0', '1.3.0').map((v) => v.version)).toEqual(['1.3.0', '1.2.1']);
    expect(versionsBetween(versions, '1.1.0', '1.10.0').map((v) => v.version)).toEqual([
      '1.10.0',
      '1.3.0',
      '1.2.1',
      '1.2.0',
    ]);
  });

  it('is empty when already on the latest', () => {
    expect(versionsBetween(versions, '1.10.0', '1.10.0')).toEqual([]);
  });
});

describe('accessDiff', () => {
  it('diffs the installed manifest against the target version in one step', () => {
    const diff = accessDiff(
      { permissions: ['prices:read', 'chat:read'], network: ['api.example.com'] },
      { permissions: ['prices:read', 'stash:read', 'notifications'], network: ['api.example.com', 'cdn.example.com'] },
    );
    expect(diff).toEqual({
      permissionsAdded: ['stash:read', 'notifications'],
      permissionsRemoved: ['chat:read'],
      hostsAdded: ['cdn.example.com'],
      hostsRemoved: [],
    });
    expect(needsReconsent(diff)).toBe(true);
  });

  it('is cumulative: a permission added and dropped again between versions does not show', () => {
    // 1.0 → 1.1 added chat:read, 1.2 dropped it again: only the endpoints matter.
    const diff = accessDiff(
      { permissions: ['prices:read'], network: [] },
      { permissions: ['prices:read'], network: [] },
    );
    expect(diff).toEqual({ permissionsAdded: [], permissionsRemoved: [], hostsAdded: [], hostsRemoved: [] });
    expect(needsReconsent(diff)).toBe(false);
  });

  it('needs no re-consent when the update only removes access', () => {
    const diff = accessDiff(
      { permissions: ['prices:read', 'chat:read'], network: ['a.example.com'] },
      { permissions: ['prices:read'], network: [] },
    );
    expect(diff.permissionsRemoved).toEqual(['chat:read']);
    expect(diff.hostsRemoved).toEqual(['a.example.com']);
    expect(needsReconsent(diff)).toBe(false);
  });

  it('counts a new host alone as needing re-consent and ignores duplicates', () => {
    const diff = accessDiff(
      { permissions: [], network: [] },
      { permissions: [], network: ['x.example.com', 'x.example.com'] },
    );
    expect(diff.hostsAdded).toEqual(['x.example.com']);
    expect(needsReconsent(diff)).toBe(true);
  });
});
