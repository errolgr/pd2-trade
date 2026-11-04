#!/usr/bin/env node
/**
 * Offline check that vendor/@pd2-trader/* is exactly what scripts/sync-shared-packages.mjs wrote: same files,
 * same sha256 as vendor/MANIFEST.json. Runs first in `npm test` (and so in CI); hand edits fail here.
 */
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { EDIT_HINT, MANIFEST_PATH, hashFile, vendoredFiles } from './vendor-lib.mjs';

if (!existsSync(MANIFEST_PATH)) {
  console.error(`✗ vendor/MANIFEST.json is missing. ${EDIT_HINT}.`);
  process.exit(1);
}
const { repo, ref, files } = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const present = new Set(vendoredFiles());
const problems = [];
for (const [path, hash] of Object.entries(files)) {
  if (!present.has(path)) problems.push(`missing   ${path}`);
  else if (hashFile(path) !== hash) problems.push(`modified  ${path}`);
}
for (const path of present) if (!(path in files)) problems.push(`added     ${path}`);

if (problems.length) {
  console.error(`✗ vendor/ differs from vendor/MANIFEST.json (${repo}@${ref}):`);
  for (const line of problems) console.error(`  ${line}`);
  console.error(`\n${EDIT_HINT}.`);
  process.exit(1);
}
console.log(`✓ vendor: ${present.size} files match ${repo}@${ref.slice(0, 12)}`);
