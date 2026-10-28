import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { nextVersion, releaseProblems } from './release.mjs';
import { readVersions, VERSION_FILES, writeVersion } from './version-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(path.join(tmpdir(), 'release-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('writeVersion', () => {
  it('bumps the app version in every version file and nothing else', () => {
    for (const file of Object.keys(VERSION_FILES)) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      cpSync(path.join(ROOT, file), path.join(dir, file));
    }
    writeVersion(dir, '9.9.9');
    expect(new Set(Object.values(readVersions(dir)))).toEqual(new Set(['9.9.9']));

    // Only the app's own lines changed: dependencies keep their versions
    for (const file of Object.keys(VERSION_FILES)) {
      const before = readFileSync(path.join(ROOT, file), 'utf8').split('\n');
      const after = readFileSync(path.join(dir, file), 'utf8').split('\n');
      const changed = after.filter((line, i) => line !== before[i]);
      expect(changed.length, file).toBe(file === 'package-lock.json' ? 2 : 1);
      expect(changed.every((line) => line.includes('9.9.9')), file).toBe(true);
    }
  });
});

describe('nextVersion', () => {
  it('bumps patch, minor and major, or takes an explicit version', () => {
    expect(nextVersion('0.10.8', 'patch')).toBe('0.10.9');
    expect(nextVersion('0.10.8', 'minor')).toBe('0.11.0');
    expect(nextVersion('0.10.8', 'major')).toBe('1.0.0');
    expect(nextVersion('0.10.8', 'v0.12.1')).toBe('0.12.1');
    expect(() => nextVersion('0.10.8', 'next')).toThrow(/x\.y\.z/);
  });
});

describe('releaseProblems', () => {
  const changelog = "export const changeLog = {\n  '0.10.8': [\n    'x',\n  ],\n};\n";
  const ok = { version: '0.10.8', liveVersion: '0.10.7', releaseTags: ['app-v0.10.7'], changelog };

  it('passes a bumped version with a changelog entry and no release yet', () => {
    expect(releaseProblems(ok)).toEqual([]);
  });

  it('rejects an unbumped or older version (numerically: 0.10.0 is newer than 0.9.13)', () => {
    expect(releaseProblems({ ...ok, liveVersion: '0.10.8' })).toEqual([expect.stringMatching(/not newer than the live v0\.10\.8/)]);
    expect(releaseProblems({ ...ok, version: '0.10.0', liveVersion: '0.9.13', changelog: "'0.10.0': [" })).toEqual([]);
  });

  it('rejects a version that already has a release, such as a stray draft', () => {
    expect(releaseProblems({ ...ok, releaseTags: ['app-v0.10.8'] })).toEqual([expect.stringMatching(/already exists/)]);
  });

  it('rejects a version without its own changelog entry', () => {
    expect(releaseProblems({ ...ok, version: '0.10.9' })).toEqual([expect.stringMatching(/no '0\.10\.9' entry/)]);
    // 0.10.80 is not 0.10.8
    expect(releaseProblems({ ...ok, changelog: "'0.10.80': [" })).toHaveLength(1);
  });
});
