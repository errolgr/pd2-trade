#!/usr/bin/env node
/**
 * Release guard. A publish run built from an unbumped main (0.10.8 shipped as "0.10.7") only failed at the
 * very end, after both builds, leaving a stray draft release behind.
 *
 *   npm run release -- <x.y.z | patch | minor | major>
 *     Bumps the app version in every version file (scripts/version-files.mjs), after checking the new version
 *     is newer than the live release, has no release yet (drafts included) and has a changelog entry.
 *     Commit the result as `chore(release): x.y.z` and merge it before running the publish workflow.
 *
 *   node scripts/release.mjs check
 *     The same checks for the committed version; the publish workflow runs it before creating the draft.
 *
 * Draft releases are only listed with a token: GITHUB_TOKEN, else `gh auth token`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkConfig, compareVersions, fetchLiveManifest } from './verify-updater.mjs';
import { readVersions, writeVersion } from './version-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'errolgr/pd2-trade';
const CHANGELOG = 'src/assets/changeLog.ts';

/** `current` bumped by `bump` (patch/minor/major), or `bump` itself when it is an x.y.z version. */
export function nextVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  if (bump === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  if (bump === 'major') return `${major + 1}.0.0`;
  compareVersions(bump, '0.0.0'); // throws unless x.y.z
  return bump.replace(/^v/, '');
}

/** Why `version` can't be released (empty when it can). */
export function releaseProblems({ version, liveVersion, releaseTags, changelog }) {
  const problems = [];
  if (liveVersion && compareVersions(version, liveVersion) <= 0) {
    problems.push(`v${version} is not newer than the live v${liveVersion}; installed apps would not update. Bump the version first.`);
  }
  if (releaseTags.includes(`app-v${version}`)) {
    problems.push(`A release tagged app-v${version} already exists (maybe a draft left by a failed run); delete it or bump.`);
  }
  const escaped = version.replaceAll('.', '\\.');
  if (!new RegExp(`^\\s*['"]${escaped}['"]\\s*:\\s*\\[`, 'm').test(changelog)) {
    problems.push(`${CHANGELOG} has no '${version}' entry.`);
  }
  return problems;
}

function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('Set GITHUB_TOKEN or sign in with `gh auth login` (draft releases are only listed with a token)');
  }
}

async function releaseTags() {
  const tags = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${githubToken()}`, Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error(`Listing releases failed: HTTP ${response.status}`);
    const releases = await response.json();
    tags.push(...releases.map((release) => release.tag_name));
    if (releases.length < 100) return tags;
  }
}

async function problemsFor(version) {
  const [live, tags] = await Promise.all([fetchLiveManifest(), releaseTags()]);
  return releaseProblems({
    version,
    liveVersion: live.version.replace(/^v/, ''),
    releaseTags: tags,
    changelog: readFileSync(path.join(ROOT, CHANGELOG), 'utf8'),
  });
}

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error('Usage: release.mjs <x.y.z | patch | minor | major | check>');
  if (arg === 'check') {
    const version = checkConfig(); // also: every version file agrees
    const problems = await problemsFor(version);
    if (problems.length) throw new Error(problems.join('\n'));
    console.log(`v${version} is ready to publish`);
    return;
  }
  const current = checkConfig();
  const version = nextVersion(current, arg);
  const problems = await problemsFor(version);
  if (problems.length) throw new Error(problems.join('\n'));
  writeVersion(ROOT, version);
  checkConfig();
  console.log(`Bumped ${current} -> ${version} in:\n  ${Object.keys(readVersions(ROOT)).join('\n  ')}`);
  console.log(`Next: commit as "chore(release): ${version}", merge, then run the publish workflow.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Release check failed:\n${error.message}`);
    process.exit(1);
  });
}
