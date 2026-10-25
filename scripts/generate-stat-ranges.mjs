#!/usr/bin/env node
/**
 * Generates the PD2 game data the price check reads, trimmed to the columns that logic uses:
 * - src/assets/stat-ranges.data.ts: the tables BH reads to draw the stat ranges on item tooltips (Properties,
 *   MagicSuffix/MagicPrefix/AutoMagic, UniqueItems, SetItems, Runes, ItemTypes and the base item tables);
 * - src/assets/tooltip.data.ts: what the game itself needs to draw the rest of an item tooltip (ItemStatCost
 *   descpriority, base damage/requirements, Gems.txt socket mods, set member lists, display names from the
 *   string tables).
 *
 *   node scripts/generate-stat-ranges.mjs --excel <dir> [--md5 <pd2data.mpq md5>]
 *     Read the tables from an already extracted data/global/excel directory (string tables from the sibling
 *     data/local/lng/eng directory).
 *
 *   EXTRACT_MPQ=<path to the extractor> node scripts/generate-stat-ranges.mjs --download
 *     Download PD2's game data from the launcher manifest (MD5-checked) and extract the tables.
 *
 * Re-run whenever the manifest's game data checksum changes (new season or balance patch).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/assets/stat-ranges.data.ts');
const TOOLTIP_OUT = path.join(ROOT, 'src/assets/tooltip.data.ts');
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
    env: { ...process.env, EXTRACT_MASKS: 'data\\global\\excel\\*;data\\local\\lng\\eng\\*.tbl' },
    stdio: 'inherit',
  });
  return { excel: path.join(dir, 'out/data/global/excel'), md5 };
}

/**
 * A D2 string table (.tbl): key → text. Layout: 21-byte header (crc u16, count u16, hash size u32, version u8,
 * index start u32, max tries u32, index end u32), `count` u16 indices, then `hash size` 17-byte nodes
 * (used u8, index u16, hash u32, key offset u32, value offset u32, value length u16).
 */
function stringTable(file) {
  const buf = readFileSync(file);
  const count = buf.readUInt16LE(2);
  const hashSize = buf.readUInt32LE(4);
  // PD2's tables are UTF-8 (the colour code ÿc is two bytes).
  const cstr = (at) => buf.toString('utf8', at, buf.indexOf(0, at));
  const out = {};
  for (let i = 0, node = 21 + count * 2; i < hashSize; i++, node += 17) {
    if (!buf[node]) continue;
    out[cstr(buf.readUInt32LE(node + 7))] = cstr(buf.readUInt32LE(node + 11));
  }
  return out;
}

/** The game's string lookup: patchstring, then expansionstring, then string. Colour codes stripped. */
function strings(excel) {
  const dir = path.join(excel, '../../local/lng/eng');
  const all = {};
  for (const name of ['string.tbl', 'expansionstring.tbl', 'patchstring.tbl']) Object.assign(all, stringTable(path.join(dir, name)));
  return (key) => (all[key] ?? key).replace(/ÿc./g, '');
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
    // `--md5 <hex>`: checksum of the game data the tables came from (recorded in the output).
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
        // For the tooltip's Required Level (magic items: looked up by the affix names in the item name).
        r.Name,
        int(r.levelreq),
        int(r.classlevelreq),
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
    `// Generated by scripts/generate-stat-ranges.mjs from PD2's game data (md5 ${md5}). Do not edit.\n` +
      '// Tables BH reads to draw tooltip stat ranges; see src/pages/price-check/lib/stat-ranges.ts.\n' +
      `import type { StatRangeData } from '@/pages/price-check/lib/stat-ranges';\n\n` +
      `export const STAT_RANGE_DATA: StatRangeData = ${JSON.stringify(data)};\n`,
  );
  console.log(
    `wrote ${path.relative(ROOT, OUT)}: ${Object.keys(props).length} properties, ${affixes.length} affixes, ` +
      `${Object.keys(uniques).length} uniques, ${Object.keys(sets).length} set items, ${Object.keys(runewords).length} runewords`,
  );

  const tooltip = tooltipData(excel, md5, mod);
  writeFileSync(
    TOOLTIP_OUT,
    `// Generated by scripts/generate-stat-ranges.mjs from PD2's game data (md5 ${md5}). Do not edit.\n` +
      '// What the game reads to draw an item tooltip; see src/pages/price-check/lib/tooltip-stats.ts.\n' +
      `import type { TooltipData } from '@/pages/price-check/lib/tooltip-stats';\n\n` +
      `export const TOOLTIP_DATA: TooltipData = ${JSON.stringify(tooltip)};\n`,
  );
  console.log(
    `wrote ${path.relative(ROOT, TOOLTIP_OUT)}: ${Object.keys(tooltip.priority).length} stat priorities, ` +
      `${Object.keys(tooltip.bases).length} bases, ${Object.keys(tooltip.gems).length} socket fillers, ` +
      `${Object.keys(tooltip.sets).length} sets`,
  );
}

/** src/assets/tooltip.data.ts (see TooltipData in src/pages/price-check/lib/tooltip-stats.ts). */
function tooltipData(excel, md5, mod) {
  const str = strings(excel);

  // ItemStatCost descpriority: the tooltip sorts property lines by it, highest first.
  const priority = {};
  for (const r of table(excel, 'ItemStatCost.txt')) if (r.descpriority !== '') priority[int(r.ID)] = int(r.descpriority);

  // Base code → [levelreq, reqstr, reqdex, speed, 1h [min, max] | 0, 2h | 0, throw | 0]. Damage only for
  // weapons: one-hand unless the base is two-handed (1or2handed: both), throw for throwing weapons.
  const bases = {};
  for (const file of ['Armor.txt', 'Weapons.txt', 'Misc.txt']) {
    for (const r of table(excel, file)) {
      if (!r.code || !r.type || r.code in bases) continue;
      const weapon = file === 'Weapons.txt';
      const twoHanded = int(r['2handed']);
      const oneHand = weapon && (!twoHanded || int(r['1or2handed'])) ? [int(r.mindam), int(r.maxdam)] : 0;
      const twoHand = weapon && twoHanded ? [int(r['2handmindam']), int(r['2handmaxdam'])] : 0;
      const thrown = weapon && int(r.maxmisdam) ? [int(r.minmisdam), int(r.maxmisdam)] : 0;
      bases[r.code] = [int(r.levelreq), int(r.reqstr), int(r.reqdex), int(r.speed), oneHand, twoHand, thrown];
    }
  }

  // Item type → the class it is restricted to ("(Amazon Only)").
  const typeClass = {};
  for (const r of table(excel, 'ItemTypes.txt')) if (r.Code && r.Class) typeClass[r.Code] = r.Class;

  // Socket fillers by display name ("Tal Rune", "Perfect Ruby"): [rune letter ('' for gems), levelreq, weapon
  // mods, helm/armor mods, shield mods].
  const misc = new Map(table(excel, 'Misc.txt').map((r) => [r.code, r]));
  const gems = {};
  for (const r of table(excel, 'Gems.txt')) {
    const item = misc.get(r.code);
    if (!item) continue;
    const mods = (slot) =>
      [1, 2, 3].map((i) => mod(r[`${slot}Mod${i}Code`], r[`${slot}Mod${i}Param`], r[`${slot}Mod${i}Min`], r[`${slot}Mod${i}Max`])).filter(Boolean);
    gems[str(item.namestr)] = [item.type === 'rune' ? str(r.letter) : '', int(item.levelreq), mods('weapon'), mods('helm'), mods('shield')];
  }

  // Unique / set item row name (what Ctrl+C exports) → [name the game shows, lvl req].
  const uniques = {};
  for (const r of table(excel, 'UniqueItems.txt')) {
    if (r.index !== 'Expansion' && r.code) uniques[r.index] = [str(r.index), int(r['lvl req'])];
  }
  const setItems = {};
  const members = {};
  for (const r of table(excel, 'SetItems.txt')) {
    if (r.index === 'Expansion' || !r.item) continue;
    setItems[r.index] = [str(r.index), int(r['lvl req'])];
    (members[r.set] ??= []).push(str(r.index));
  }
  // Set name the game shows (= Ctrl+C `set`) → its items as the tooltip lists them (reverse table order).
  const sets = {};
  for (const r of table(excel, 'Sets.txt')) {
    if (members[r.index]) sets[str(r.name)] = [...members[r.index]].reverse();
  }

  // "Reanimate as:" monsters (MonStats hcIdx → name) the unique/set/runeword rows use.
  const monStats = new Map(table(excel, 'MonStats.txt').map((r) => [r.hcIdx, r]));
  const monsters = {};
  for (const [file, prop, param] of [
    ['UniqueItems.txt', /^prop(\d+)$/, 'par'],
    ['SetItems.txt', /^a?prop(\d+[ab]?)$/, 'par'],
    ['Runes.txt', /^T1Code(\d+)$/, 'T1Param'],
  ]) {
    for (const r of table(excel, file)) {
      for (const [key, code] of Object.entries(r)) {
        const m = prop.exec(key);
        if (!m || code.toLowerCase() !== 'reanimate') continue;
        const id = r[key.startsWith('a') ? `apar${m[1]}` : `${param}${m[1]}`];
        const mon = monStats.get(id);
        if (mon) monsters[int(id)] = str(mon.NameStr);
      }
    }
  }

  return { source: { pd2dataMd5: md5 }, priority, bases, typeClass, gems, uniques, setItems, sets, monsters };
}

await main();
