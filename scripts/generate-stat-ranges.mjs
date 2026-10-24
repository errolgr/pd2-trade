#!/usr/bin/env node
/**
 * Generates src/assets/stat-ranges.data.ts: the PD2 data tables BH reads to draw the stat ranges on
 * item tooltips (Properties, MagicSuffix/MagicPrefix/AutoMagic, UniqueItems, SetItems, Runes,
 * ItemTypes and the base item tables), trimmed to the columns that logic uses.
 *
 *   node scripts/generate-stat-ranges.mjs --excel <dir>
 *     Read the tables from an already extracted data/global/excel directory.
 *
 *   EXTRACT_MPQ=<path to extract_mpq> node scripts/generate-stat-ranges.mjs --download
 *     Download pd2data.mpq from PD2's launcher manifest (MD5-checked) and extract the tables with
 *     StormLib's extract_mpq (libd2-pd2/packages/pd2/tools/extract_mpq; usage: extract_mpq <out> <mpq>,
 *     EXTRACT_MASKS selects members).
 *
 * Re-run whenever the manifest's pd2data.mpq checksum changes (new season or balance patch).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/assets/stat-ranges.data.ts');
const CDN = 'https://pd2-client-files.projectdiablo2.com';

async function download() {
  const manifest = JSON.parse((await (await fetch(`${CDN}/metadata.json`)).text()).replace(/^\uFEFF/, ''));
  const entry = manifest.checksum.map((e) => e.split('  ')).find(([, name]) => name === 'pd2data.mpq');
  if (!entry) throw new Error('pd2data.mpq is not in the launcher manifest');
  const [md5] = entry;
  const bytes = Buffer.from(await (await fetch(`${CDN}/pd2data.mpq`)).arrayBuffer());
  const got = createHash('md5').update(bytes).digest('hex');
  if (got !== md5) throw new Error(`pd2data.mpq md5 ${got} != manifest ${md5}`);
  const dir = mkdtempSync(path.join(tmpdir(), 'pd2data-'));
  const mpq = path.join(dir, 'pd2data.mpq');
  writeFileSync(mpq, bytes);
  const extract = process.env.EXTRACT_MPQ;
  if (!extract) throw new Error('set EXTRACT_MPQ to the extract_mpq binary');
  execFileSync(extract, [path.join(dir, 'out'), mpq], {
    env: { ...process.env, EXTRACT_MASKS: 'data\\global\\excel\\*' },
    stdio: 'inherit',
  });
  return { excel: path.join(dir, 'out/data/global/excel'), md5 };
}

function table(excel, name) {
  const rows = readFileSync(path.join(excel, name), 'latin1')
    .split(/\r?\n/)
    .map((line) => line.split('\t'));
  const head = rows[0];
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const int = (v) => (v === '' || v === undefined ? 0 : Number.parseInt(v, 10) || 0);

async function main() {
  const args = process.argv.slice(2);
  let excel;
  let md5 = 'unknown';
  if (args[0] === '--download') ({ excel, md5 } = await download());
  else if (args[0] === '--excel' && args[1]) {
    excel = path.resolve(args[1]);
    // `--md5 <hex>`: checksum of the pd2data.mpq the tables came from (recorded in the output).
    if (args[2] === '--md5' && args[3]) md5 = args[3];
  } else {
    console.error('usage: generate-stat-ranges.mjs --excel <dir> [--md5 <pd2data.mpq md5>] | --download');
    process.exit(2);
  }

  const statIds = new Map(table(excel, 'ItemStatCost.txt').map((r) => [r.Stat, int(r.ID)]));
  const skillIds = new Map(table(excel, 'Skills.txt').map((r) => [r.skill.toLowerCase(), int(r.Id)]));
  /** ItemsTxtStat.dwPar as the game compiles it: a number, or a skill looked up by name. */
  const par = (v) => (v === '' ? 0 : /^-?\d+$/.test(v) ? int(v) : (skillIds.get(v.toLowerCase()) ?? 0));

  // Properties: code → stat ids / funcs (7 slots, -1 = none). Codes are lower-cased (the txt
  // compiler matches them case-insensitively).
  const props = {};
  for (const r of table(excel, 'Properties.txt')) {
    if (r.code === 'Expansion') continue;
    const stats = [];
    const funcs = [];
    for (let i = 1; i <= 7; i++) {
      stats.push(r[`stat${i}`] ? (statIds.get(r[`stat${i}`]) ?? -1) : -1);
      funcs.push(int(r[`func${i}`]));
    }
    props[r.code.toLowerCase()] = [stats, funcs];
  }
  /** [prop code, par, min, max] for a mod column set; null for an empty slot. */
  const mod = (code, p, min, max) => (code ? [code.toLowerCase(), par(p), int(min), int(max)] : null);
  /**
   * A row's mod slots in column order. Empty slots stay (as null): BH stops scanning a row at the first empty
   * one (Titan's Revenge has no prop5, so its later life steal never gets a range). Trailing empties dropped.
   */
  const slots = (list) => {
    const out = [...list];
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  };

  const itemTypes = {};
  for (const r of table(excel, 'ItemTypes.txt')) {
    if (r.Code) itemTypes[r.Code] = [r.Equiv1, r.Equiv2].filter(Boolean);
  }

  // Base item code → [item type, has an Automagic group]. (The clipboard's display name → code mapping is
  // src/common/item-types.ts; the txt `name` column is internal, e.g. "Charm Small".)
  const bases = {};
  for (const file of ['Armor.txt', 'Weapons.txt', 'Misc.txt']) {
    for (const r of table(excel, file)) {
      if (r.code && r.type && !(r.code in bases)) bases[r.code] = [r.type, r['auto prefix'] ? 1 : 0];
    }
  }

  // BH walks the magic affix table in game order: MagicSuffix, MagicPrefix, then AutoMagic.
  const affixes = [];
  for (const [file, auto] of [
    ['MagicSuffix.txt', 0],
    ['MagicPrefix.txt', 0],
    ['AutoMagic.txt', 1],
  ]) {
    for (const r of table(excel, file)) {
      if (r.Name === 'Expansion') continue;
      const mods = slots([1, 2, 3].map((i) => mod(r[`mod${i}code`], r[`mod${i}param`], r[`mod${i}min`], r[`mod${i}max`])));
      if (!mods.length) continue;
      affixes.push([
        auto,
        int(r.version),
        int(r.level),
        // Flags are tested for non-zero like the game does (PD2 uses rare = 3 on newer affixes).
        int(r.spawnable) ? 1 : 0,
        int(r.rare) ? 1 : 0,
        [1, 2, 3, 4, 5, 6, 7].map((i) => r[`itype${i}`]).filter(Boolean),
        [1, 2, 3, 4, 5].map((i) => r[`etype${i}`]).filter(Boolean),
        mods,
      ]);
    }
  }

  const uniques = {};
  for (const r of table(excel, 'UniqueItems.txt')) {
    if (r.index === 'Expansion' || !r.code) continue;
    uniques[r.index] = slots(Array.from({ length: 12 }, (_, i) => mod(r[`prop${i + 1}`], r[`par${i + 1}`], r[`min${i + 1}`], r[`max${i + 1}`])));
  }
  // Set items: the item's own props, then the partial set bonus props (BH reads 9 + 10 slots).
  const sets = {};
  for (const r of table(excel, 'SetItems.txt')) {
    if (r.index === 'Expansion' || !r.item) continue;
    const own = Array.from({ length: 9 }, (_, i) => mod(r[`prop${i + 1}`], r[`par${i + 1}`], r[`min${i + 1}`], r[`max${i + 1}`]));
    const bonus = [1, 2, 3, 4, 5].flatMap((n) =>
      ['a', 'b'].map((s) => mod(r[`aprop${n}${s}`], r[`apar${n}${s}`], r[`amin${n}${s}`], r[`amax${n}${s}`])),
    );
    sets[r.index] = slots([...own, ...bonus]);
  }
  // Keyed by row name (Runeword47): `Rune Name` is not what the game shows (Runeword47 is "Grief" in game,
  // "Widowmaker" in that column); the display name → key mapping is items.ts `runeWords`. Some runewords have
  // one row per item class (Fortitude: armor and weapon), told apart by itype/etype.
  const runewords = {};
  for (const r of table(excel, 'Runes.txt')) {
    (runewords[r.Name] ??= []).push([
      [1, 2, 3, 4, 5, 6].map((i) => r[`itype${i}`]).filter(Boolean),
      [1, 2, 3].map((i) => r[`etype${i}`]).filter(Boolean),
      slots(Array.from({ length: 7 }, (_, i) => mod(r[`T1Code${i + 1}`], r[`T1Param${i + 1}`], r[`T1Min${i + 1}`], r[`T1Max${i + 1}`]))),
    ]);
  }

  const data = { source: { pd2dataMd5: md5 }, props, itemTypes, bases, affixes, uniques, sets, runewords };
  writeFileSync(
    OUT,
    `// Generated by scripts/generate-stat-ranges.mjs from PD2's pd2data.mpq (md5 ${md5}). Do not edit.\n` +
      '// Tables BH reads to draw tooltip stat ranges; see src/pages/price-check/lib/stat-ranges.ts.\n' +
      `import type { StatRangeData } from '@/pages/price-check/lib/stat-ranges';\n\n` +
      `export const STAT_RANGE_DATA: StatRangeData = ${JSON.stringify(data)};\n`,
  );
  console.log(
    `wrote ${path.relative(ROOT, OUT)}: ${Object.keys(props).length} properties, ${affixes.length} affixes, ` +
      `${Object.keys(uniques).length} uniques, ${Object.keys(sets).length} set items, ${Object.keys(runewords).length} runewords`,
  );
}

await main();
