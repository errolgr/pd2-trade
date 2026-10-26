import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Item, Stat } from './interfaces';
import { statText, tooltipLines, type TooltipLine } from './tooltip-lines';

const item = (over: Partial<Item>): Item => ({
  name: 'Test',
  quality: 'Rare',
  type: 'Ring',
  iLevel: 90,
  stats: [],
  ...over,
});
const texts = (stats: Stat[]) => tooltipLines(item({ stats })).stats.map((l) => l.text);

describe('statText', () => {
  it('places the value the way the stat description says (D2 descfunc/descval)', () => {
    expect(statText({ stat_id: 105, name: 'Faster Cast Rate', value: 20 })).toBe('+20% Faster Cast Rate');
    expect(statText({ stat_id: 39, name: 'Fire Resist', value: 30 })).toBe('Fire Resist +30%');
    expect(statText({ stat_id: 80, name: 'Better Chance of Getting Magic Items', value: 25 })).toBe(
      '25% Better Chance of Getting Magic Items',
    );
    expect(statText({ stat_id: 7, name: 'to Life', value: 40 })).toBe('+40 to Life');
    expect(statText({ stat_id: 216, name: 'to Life', value: 99 })).toBe('+99 to Life (Based on Character Level)');
    expect(statText({ stat_id: 252, name: 'Repairs %d durability per second', value: 3 })).toBe(
      'Repairs 1 durability in 33 seconds',
    );
  });

  it('builds skill lines from the skill field', () => {
    expect(
      statText({ stat_id: 188, name: '+%d to Javelin and Spear Skills', value: 3, skill: 'Martial Arts (Assassin)' }),
    ).toBe('+3 to Martial Arts (Assassin Only)');
    expect(statText({ stat_id: 83, name: 'to Sorceress Skill Levels', value: 2 })).toBe('+2 to Sorceress Skill Levels');
    expect(statText({ stat_id: 107, name: 'to Teleport', value: 3, skill: 'Teleport (Sorceress)' })).toBe(
      '+3 to Teleport (Sorceress Only)',
    );
    expect(statText({ stat_id: 97, name: 'to Teleport', value: 1, skill: 'Teleport' })).toBe('+1 to Teleport');
    expect(
      statText({ stat_id: 204, name: '(%d/%d Charges)', value: 20, level: 7, skill: 'Venom', range: { max: 25 } }),
    ).toBe('Level 7 Venom (20/25 Charges)');
    expect(statText({ name: '', level: 3, skill: 'Venom', charges: '(25/31 Charges)' } as Stat)).toBe(
      'Level 3 Venom (25/31 Charges)',
    );
  });

  it('fills printf descriptions in chance, level, value order', () => {
    expect(
      statText({
        stat_id: 201,
        name: '%d%% Chance to cast level %d %s when struck',
        chance: 10,
        level: 15,
        skill: 'Frost Nova',
      }),
    ).toBe('10% Chance to cast level 15 Frost Nova when struck');
    expect(statText({ name: '18% Chance to cast level 35 Lightning on attack', chance: 18, level: 35 } as Stat)).toBe(
      '18% Chance to cast level 35 Lightning on attack',
    );
  });

  it('keeps a literal leading % with the value', () => {
    expect(statText({ stat_id: 998, name: '% Enhanced Damage', value: 150 })).toBe('+150% Enhanced Damage');
  });
});

describe('tooltipLines', () => {
  it('merges the stat pairs PD2 shows as one line', () => {
    expect(
      texts([
        { stat_id: 48, name: 'to Minimum Fire Damage', value: 10 },
        { stat_id: 49, name: 'to Maximum Fire Damage', value: 30 },
        { stat_id: 17, name: 'Enhanced Maximum Damage', value: 200 },
        { stat_id: 18, name: 'Enhanced Minimum Damage', value: 200 },
      ]),
    ).toEqual(['+200% Enhanced Damage', 'Adds 10-30 fire damage']);
  });

  it('shows All Resistances only when all four resists are equal', () => {
    const res = (v: [number, number, number, number]) =>
      [39, 41, 43, 45].map((id, i) => ({ stat_id: id, name: 'Resist', value: v[i] }));
    expect(texts(res([11, 11, 11, 11]))).toEqual(['All Resistances +11']);
    expect(texts(res([11, 11, 11, 12]))).toHaveLength(4);
  });

  it('combines attributes even when Strength comes without a stat_id', () => {
    const stats: Stat[] = [
      { name: 'to Strength', value: 2 } as Stat,
      { stat_id: 1, name: 'to Energy', value: 2 },
      { stat_id: 2, name: 'to Dexterity', value: 2 },
      { stat_id: 3, name: 'to Vitality', value: 2 },
    ];
    expect(texts(stats)).toEqual(['+2 to all Attributes']);
  });

  it('converts poison per-frame damage to the in-game total', () => {
    expect(
      texts([
        { stat_id: 57, name: 'to Minimum Poison Damage', value: 256 },
        { stat_id: 58, name: 'to Maximum Poison Damage', value: 512 },
        { stat_id: 59, name: 'Poison Length', value: 75 },
      ]),
    ).toEqual(['Adds 75-150 poison damage over 3 seconds']);
  });

  it('titles runewords in gold over a grey base and magic items on one line', () => {
    expect(
      tooltipLines(
        item({ isRuneword: true, runeword: 'Enigma', name: 'Mage Plate', type: 'Mage Plate', quality: 'Superior' }),
      ).title,
    ).toEqual([
      { text: 'Enigma', color: 'unique' },
      { text: 'Mage Plate', color: 'gray' },
    ]);
    expect(tooltipLines(item({ name: 'Shimmering Ring of the Fox', quality: 'Magic' })).title).toEqual([
      { text: 'Shimmering Ring of the Fox', color: 'magic' },
    ]);
  });
});

/**
 * Ground truth from the live S14 client (bh-harness, BH "always show stat ranges" on): per item, BH's Ctrl+C
 * JSON and every tooltip line as the game drew it. Re-capture each season with the pd2-trade-oracle scripts,
 * after regenerating the src/assets data from the same game data.
 */
const ORACLE = readFileSync(path.join(__dirname, '__fixtures__/stat-ranges-oracle.s14.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line) as { clipboard: Item; tooltip: string[] });

/** Lines tooltipLines leaves out on purpose (see the note in tooltip-lines.ts), and PD2's inventory hint. */
function drawnByUs(item: Item, line: string): boolean {
  if (line === 'Ctrl+Right: Drop' || /^(Durability|Chance to Block): /.test(line)) return false;
  return !(/^Required Level: /.test(line) && (item.quality === 'Rare' || item.quality === 'Crafted'));
}

/**
 * Lines the clipboard can't give, per item (Ctrl+C name or runeword). `game`: drawn by the game, not by us;
 * `ours`: drawn by us, not by the game (a line in both lists is one we draw in another position).
 */
const KNOWN_GAPS: Array<{ item: string; quality?: string; game?: string[]; ours?: string[]; why: string }> = [
  {
    item: 'Pain Mantle',
    game: ['Physical Damage Taken Reduced by 9% [4 - 25]'],
    why: 'BH merges Ctrl+C stats with the same name (keeps the larger): the % reduction is lost',
  },
  {
    item: 'Mage Plate',
    quality: 'Inferior',
    game: ['Cracked Mage Plate'],
    ours: ['Mage Plate'],
    why: 'low quality prefix is not exported',
  },
  {
    item: "Sigon's Gage",
    game: ['+30% Increased Attack Speed', '', '10% Life stolen per hit', '+100 Defense'],
    why: 'set bonuses of a worn item depend on the other pieces worn',
  },
  {
    item: "Sigon's Shelter",
    game: ['Attacker Takes Damage of 20', '', '10% Life stolen per hit', '+100 Defense'],
    why: 'set bonuses of a worn item depend on the other pieces worn',
  },
  {
    item: "Gheed's Fortune",
    game: ['Reduces all Vendor Prices 11% [10 - 15]'],
    ours: ['Reduces all Vendor Prices 11% [10 - 15]'],
    why: 'tie at descpriority 8 that the game breaks against stat id order (every other tie follows it)',
  },
  // Per-level stats scale with the wearer's level (the capture: 85); the damage/defense they feed is left out.
  { item: 'Skull Grasp', game: ['Defense: 54'], why: 'per-level defense' },
  { item: 'Stormshield', game: ['Defense: 462'], why: 'per-level defense' },
  { item: 'Windforce', game: ['Two-Hand Damage: 56 to 575'], why: 'per-level max damage' },
  {
    item: 'Hellslayer',
    game: ['Two-Hand Damage: 154 to 870', '+255% Enhanced Maximum Damage (Based on Character Level)'],
    why: 'per-level max enhanced damage, not in the Ctrl+C export either',
  },
  // Runeword mods BH's export leaves out and the row doesn't fix.
  {
    item: 'Grief',
    game: ['One-Hand Damage: 319 to 364', 'Adds 280-320 damage [320 - 360]'],
    why: 'rolled max damage not exported',
  },
  {
    item: 'Heart of the Oak',
    game: ['Level 4 Oak Sage (6/25 Charges)', 'Level 14 Summon Ravens (50/60 Charges)'],
    why: 'current charges not exported',
  },
  { item: 'Enigma', game: ['Level 1 Blink (5/5 Charges)'], why: 'current charges not exported' },
  {
    item: 'Beast',
    game: ['Level 13 Summon Grizzly (10/35 Charges)', '+3 to Hunger'],
    ours: ['+18 to Hunger'],
    why: 'current charges not exported; the injected item exports o-skills the client draws differently',
  },
  // Injected items (pd2oracle gen) carry the sockets stat without being socketed, so the client draws no sockets.
  { item: 'Crown of Ages', ours: ['Socketed (2)'], why: 'injected item' },
  { item: "Immortal King's Will", ours: ['Socketed (2)'], why: 'injected item' },
  { item: "Griswold's Honor", ours: ['Socketed (2)'], why: 'injected item' },
];

const joined = (l: TooltipLine) => `${l.text}${l.star ? '*' : ''}${l.range ? ` ${l.range}` : ''}`;
/** Per-level values scale with the wearer's level (the capture's: 85): compared without the number. */
const perLevel = (line: string) => line.replace(/^([+-]?)\d+(.*\(Based on Character Level\))/, '$1#$2');

function without(lines: string[], drop: string[] = []): string[] {
  const out = [...lines];
  for (const d of drop) {
    const i = out.indexOf(d);
    if (i >= 0) out.splice(i, 1);
  }
  return out;
}

describe('tooltipLines matches the PD2 tooltip (S14 client capture)', () => {
  it('draws every line the game draws, in its order', () => {
    const mismatches: string[] = [];
    let compared = 0;
    for (const { clipboard, tooltip } of ORACLE) {
      const key = clipboard.isRuneword ? clipboard.runeword : (clipboard.name ?? clipboard.type);
      const gap = KNOWN_GAPS.find((g) => g.item === key && (!g.quality || g.quality === clipboard.quality));
      const t = tooltipLines(clipboard);
      const ours = [...t.title, ...t.header, ...t.stats, ...t.footer].map(joined);
      if (t.set.length) ours.push('', ...t.set.map(joined));
      const game = without(
        tooltip.filter((line) => drawnByUs(clipboard, line)),
        gap?.game,
      ).map(perLevel);
      const mine = without(ours, gap?.ours).map(perLevel);
      compared += game.length;
      if (JSON.stringify(mine) !== JSON.stringify(game)) {
        mismatches.push(`${key}:\n  ours ${JSON.stringify(mine)}\n  game ${JSON.stringify(game)}`);
      }
    }
    expect(mismatches).toEqual([]);
    expect(compared).toBeGreaterThan(900);
  });

  it('colours the lines like the game', () => {
    const find = (name: string) => ORACLE.find((o) => (o.clipboard.runeword ?? o.clipboard.name) === name)!.clipboard;
    const spirit = tooltipLines(find('Spirit'));
    expect(spirit.title).toEqual([
      { text: 'Spirit', color: 'unique' },
      { text: 'Crystal Sword', color: 'gray' },
    ]);
    expect(spirit.header[0]).toEqual({ text: "'TalThulOrtAmn'", color: 'unique' });
    expect(spirit.footer).toEqual([{ text: 'Socketed (4)', color: 'magic' }]);

    const tal = tooltipLines(find("Tal Rasha's Lidless Eye"));
    expect(tal.header).toContainEqual({ text: '(Sorceress Only)', color: 'red' });
    expect(tal.set[0]).toEqual({ text: "Tal Rasha's Wrappings", color: 'unique' });
    expect(tal.set.filter((l) => l.color === 'set').map((l) => l.text)).toEqual(["Tal Rasha's Lidless Eye"]);

    const maras = ORACLE.map((o) => o.clipboard).filter((c) => c.name === "Mara's Kaleidoscope")[1];
    const lines = tooltipLines(maras).stats;
    expect(lines[0]).toEqual({ text: 'Corrupted', color: 'red' });
    expect(lines.find((l) => l.text === 'Fire Resist +47%')).toEqual({
      text: 'Fire Resist +47%',
      color: 'magic',
      range: '[20 - 30]',
      star: true,
    });
  });
});
