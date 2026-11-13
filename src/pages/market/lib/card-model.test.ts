import { describe, expect, it } from 'vitest';
import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import {
  amountIndex,
  buildCardModel,
  displayMods,
  groupSockets,
  mergeDamageLines,
  modMatchesStatKey,
  multipliedLabel,
  perLevelLabel,
} from './card-model';

// Fixtures trimmed from live api.projectdiablo2.com market listings (2026-10-21).
let priority = 200;
const mod = (name: string, values: number[], label: string, extra: Partial<Modifier> = {}): Modifier => ({
  name,
  values,
  label,
  priority: priority--,
  ...extra,
});
const item = (over: Partial<ItemDetail>): ItemDetail =>
  ({ name: 'Item', is_runeword: false, socket_count: 0, modifiers: [], socketed: [], ...over }) as ItemDetail;
const socket = (name: string, modifiers: Modifier[]) => item({ name, modifiers });

const ohm = () => socket('Ohm Rune', [mod('maxdamage_percent', [45], '+45% Enhanced Damage')]);

const windforce = item({
  name: 'Windforce',
  socket_count: 4,
  corruptions: ['item_fasterattackrate'],
  modifiers: [
    mod('corrupted', [0, 20], 'Corrupted'),
    mod('item_skillonhit', [40, 240, 12], '12% Chance to cast level 40 Twister on striking'),
    mod('item_fasterattackrate', [80], '80% Increased Attack Speed', { corrupted: true }),
    mod('item_maxdamage_perlevel', [16], '+16 to Maximum Damage (Based on Character Level)'),
    mod('maxdamage_percent', [530, 350], '+530% Enhanced Damage', { min: 275, max: 350 }),
    mod('manadrainmindam', [8], '8% Mana stolen per hit', { min: 6, max: 8 }),
    mod('strength', [20], '+20 to Strength'),
  ],
  socketed: [ohm(), ohm(), ohm(), ohm()],
});

const byName = (model: ReturnType<typeof buildCardModel>, name: string) => model.mods.find((m) => m.mod.name === name)!;

describe('buildCardModel', () => {
  it('Windforce: 530% ED = 350 own roll + 180 from 4 × Ohm', () => {
    const model = buildCardModel(windforce);
    expect(model.groups).toHaveLength(1);
    expect(model.groups[0]).toMatchObject({ name: 'Ohm Rune', sockets: [0, 1, 2, 3], element: null });
    expect(model.showSockets).toBe(true);
    expect(model.groups[0].lines).toEqual([{ each: '+45% Enhanced Damage', total: '+180% Enhanced Damage' }]);

    const ed = byName(model, 'maxdamage_percent');
    expect(ed).toMatchObject({ own: 350, ownKind: 'roll', socketOnly: false });
    expect(ed.sources).toEqual([{ group: 0, amount: 180 }]);

    expect(byName(model, 'manadrainmindam')).toMatchObject({ own: 8, sources: [] });
    expect(byName(model, 'item_fasterattackrate')).toMatchObject({ ownKind: 'corruption', corrupted: true });
    expect(byName(model, 'item_maxdamage_perlevel')).toMatchObject({ perLevel: true, label: '+16 to Maximum Damage' });
    expect(model.mods.some((m) => m.mod.name === 'corrupted')).toBe(false);
    expect(model.emptySockets).toBe(0);
  });

  it('mixed Rainbow Facets: separate groups with element/trigger subtitles, procs split per group', () => {
    const facet = (mastery: number) =>
      socket('Rainbow Facet', [
        mod('item_skillonlevelup', [41, 48, 100], '100% Chance to cast level 41 Nova when you Level-Up'),
        mod('passive_ltng_mastery', [mastery], `${mastery}% to Lightning Skill Damage`),
        mod('passive_ltng_pierce', [5], '-5% to Enemy Lightning Resistance'),
        mod('lightmindam', [1, 74], 'Adds 1-74 Lightning Damage'),
      ]);
    const javelin = item({
      name: 'Maiden Javelin',
      socket_count: 2,
      modifiers: [
        mod('item_skillonlevelup', [41, 48, 200], '200% Chance to cast level 41 Nova when you Level-Up'),
        mod('lightmindam', [2, 74], 'Adds 2-74 Lightning Damage'),
        mod('passive_ltng_mastery', [7], '7% to Lightning Skill Damage'),
        mod('passive_ltng_pierce', [10], '-10% to Enemy Lightning Resistance'),
        mod('item_magicbonus', [28], '28% Better Chance of Getting Magic Items'),
      ],
      socketed: [facet(4), facet(3)],
    });
    const model = buildCardModel(javelin);
    expect(model.groups.map((g) => [g.name, g.subtitle, g.element])).toEqual([
      ['Rainbow Facet', 'Lightning · on level-up', 'lightning'],
      ['Rainbow Facet', 'Lightning · on level-up', 'lightning'],
    ]);
    expect(model.socketGroups).toEqual([0, 1]);
    expect(byName(model, 'item_skillonlevelup')).toMatchObject({
      socketOnly: true,
      sources: [
        { group: 0, amount: 100 },
        { group: 1, amount: 100 },
      ],
    });
    expect(byName(model, 'passive_ltng_mastery')).toMatchObject({
      socketOnly: true,
      sources: [
        { group: 0, amount: 4 },
        { group: 1, amount: 3 },
      ],
    });
    expect(byName(model, 'passive_ltng_pierce')).toMatchObject({ socketOnly: true });
    // Damage pairs don't sum consistently: never split
    expect(byName(model, 'lightmindam')).toMatchObject({ sources: [], socketOnly: false });
    expect(byName(model, 'item_magicbonus')).toMatchObject({ sources: [], own: 28, ownKind: 'base' });
  });

  it('separates facets by element and trigger', () => {
    const fire = socket('Rainbow Facet', [
      mod('item_skillondeath', [31, 56, 100], '100% Chance to cast level 31 Meteor when you Die'),
      mod('passive_fire_mastery', [5], '5% to Fire Skill Damage'),
    ]);
    const cold = socket('Rainbow Facet', [
      mod('item_skillonlevelup', [43, 44, 100], '100% Chance to cast level 43 Frost Nova when you Level-Up'),
      mod('passive_cold_mastery', [5], '5% to Cold Skill Damage'),
    ]);
    const { groups } = groupSockets([fire, cold, fire]);
    expect(groups.map((g) => [g.subtitle, g.items.length, g.sockets])).toEqual([
      ['Fire · on death', 2, [0, 2]],
      ['Cold · on level-up', 1, [1]],
    ]);
  });

  it('jewels: partial and socket-only lines', () => {
    const veil = item({
      name: 'Veil of Steel',
      socket_count: 3,
      modifiers: [
        mod('maxdamage_percent', [116, 71], '+116% Enhanced Damage', { min: 60, max: 90 }),
        mod('tohit', [100], '+100 to Attack Rating'),
        mod('lightresist', [44], 'Lightning Resist 44%'),
        mod('item_req_percent', [-30], 'Requirements -30%'),
      ],
      socketed: [
        socket('Jewel', [
          mod('tohit', [100], '+100 to Attack Rating'),
          mod('lightresist', [12], 'Lightning Resist 12%'),
          mod('item_req_percent', [-15], 'Requirements -15%'),
          mod('maxdamage_percent', [28, 28], '+28% Enhanced Damage'),
        ]),
        socket('Rusty Jewel of Freedom', [
          mod('item_req_percent', [-15], 'Requirements -15%'),
          mod('maxdamage_percent', [17, 17], '+17% Enhanced Damage'),
        ]),
      ],
    });
    const model = buildCardModel(veil);
    // 116 − 28 − 17 = 71 (matches the API's own value)
    expect(byName(model, 'maxdamage_percent')).toMatchObject({ own: 71, ownKind: 'roll' });
    expect(byName(model, 'tohit')).toMatchObject({ socketOnly: true, sources: [{ group: 0, amount: 100 }] });
    expect(byName(model, 'lightresist')).toMatchObject({
      own: 32,
      ownKind: 'base',
      sources: [{ group: 0, amount: 12 }],
    });
    expect(byName(model, 'item_req_percent')).toMatchObject({ socketOnly: true });
    expect(model.emptySockets).toBe(1);

    const hydra = item({
      name: 'Hydra Bow',
      socket_count: 1,
      modifiers: [mod('maxdamage_percent', [453, 413], '+453% Enhanced Damage', { min: 252, max: 400 })],
      socketed: [socket('Ruby Jewel of Freedom', [mod('maxdamage_percent', [40, 40], '+40% Enhanced Damage')])],
    });
    expect(byName(buildCardModel(hydra), 'maxdamage_percent')).toMatchObject({
      own: 413,
      sources: [{ group: 0, amount: 40 }],
    });
  });

  it('names the corruption part of a line a rune adds to', () => {
    const bow = item({
      socket_count: 1,
      modifiers: [mod('item_fasterattackrate', [100], '100% Increased Attack Speed', { corrupted: true })],
      socketed: [socket('Shael Rune', [mod('item_fasterattackrate', [20], '20% Increased Attack Speed')])],
    });
    expect(byName(buildCardModel(bow), 'item_fasterattackrate')).toMatchObject({
      own: 80,
      ownKind: 'corruption',
      sources: [{ group: 0, amount: 20 }],
    });
    // Corruption on a ranged line: roll and corruption can't be told apart → no roll %, not called corruption
    const pike = item({
      socket_count: 2,
      modifiers: [
        mod('maxdamage_percent', [622, 532], '+622% Enhanced Damage', { min: 200, max: 260, corrupted: true }),
      ],
      socketed: [ohm(), ohm()],
    });
    expect(byName(buildCardModel(pike), 'maxdamage_percent')).toMatchObject({ own: 532, ownKind: 'base' });
  });

  it('runewords keep their bonuses: runes listed, nothing credited', () => {
    const infinity = item({
      name: 'Infinity',
      is_runeword: true,
      socket_count: 4,
      modifiers: [
        mod('maxdamage_percent', [283, 283], '+283% Enhanced Damage', { min: 255, max: 325 }),
        mod('item_crushingblow', [40], '40% Chance of Crushing Blow'),
        mod('item_vitality_perlevel', [0.5], '+0.5 to Vitality (Based on Character Level)'),
      ],
      socketed: [
        socket('Ber Rune', [mod('item_crushingblow', [20], '20% Chance of Crushing Blow')]),
        socket('Mal Rune', [mod('item_preventheal', [1], 'Prevent Monster Heal')]),
        socket('Ber Rune', [mod('item_crushingblow', [20], '20% Chance of Crushing Blow')]),
        socket('Ist Rune', [mod('item_magicbonus', [30], '30% Better Chance of Getting Magic Items')]),
      ],
    });
    const model = buildCardModel(infinity);
    expect(model.groups.map((g) => `${g.items.length}×${g.name}`)).toEqual(['2×Ber Rune', '1×Mal Rune', '1×Ist Rune']);
    expect(model.socketGroups).toEqual([0, 1, 0, 2]);
    expect(model.mods.every((m) => m.sources.length === 0)).toBe(true);
    expect(byName(model, 'item_vitality_perlevel')).toMatchObject({ perLevel: true, label: '+0.5 to Vitality' });
  });

  it('skips attribution without socketed mod data', () => {
    const bare = item({
      socket_count: 2,
      modifiers: [mod('maxdamage_percent', [200, 200], '+200% Enhanced Damage', { min: 150, max: 200 })],
      socketed: undefined,
    });
    const model = buildCardModel(bare);
    expect(model.groups).toEqual([]);
    expect(model.emptySockets).toBe(2);
    expect(model.showSockets).toBe(false);
    expect(byName(model, 'maxdamage_percent')).toMatchObject({ own: 200, sources: [] });
  });

  it('lists Zod as Indestructible although PD2 sends it without modifiers', () => {
    const pike = item({ name: 'Matriarchal Pike', socket_count: 2, socketed: [socket('Zod Rune', []), ohm()] });
    const { groups } = buildCardModel(pike);
    expect(groups[0]).toMatchObject({ name: 'Zod Rune', lines: [{ each: 'Indestructible', total: null }] });
    expect(groups[1].lines).toEqual([{ each: '+45% Enhanced Damage', total: null }]);
  });

  it('hides the Socketed section when no socketed item lists a bonus', () => {
    const unlisted = item({ socket_count: 2, socketed: [socket('Mystery Rune', []), socket('Mystery Rune', [])] });
    const model = buildCardModel(unlisted);
    expect(model.groups).toHaveLength(1);
    expect(model.showSockets).toBe(false);
  });
});

describe('card-model helpers', () => {
  it('amountIndex', () => {
    expect(amountIndex(mod('strength', [20], ''))).toBe(0);
    expect(amountIndex(mod('maxdamage_percent', [530, 350], ''))).toBe(0);
    expect(amountIndex(mod('item_skillonhit', [40, 240, 12], ''))).toBe(2);
    expect(amountIndex(mod('item_singleskill', [149, 3], ''))).toBe(1);
    expect(amountIndex(mod('firedam', [19, 14], ''))).toBeNull();
  });

  it('multipliedLabel, perLevelLabel, modMatchesStatKey', () => {
    expect(multipliedLabel(mod('maxdamage_percent', [45], '+45% Enhanced Damage'), 2)).toBe('+90% Enhanced Damage');
    expect(multipliedLabel(mod('item_req_percent', [-15], 'Requirements -15%'), 2)).toBe('Requirements -30%');
    expect(multipliedLabel(mod('firedam', [8, 14], 'Adds 8-14 Fire Damage'), 2)).toBeNull();
    expect(perLevelLabel('+20 to Strength')).toEqual({ label: '+20 to Strength', perLevel: false });
    expect(modMatchesStatKey(mod('item_singleskill', [149, 3], ''), 'item_singleskill{149}')).toBe(true);
    expect(modMatchesStatKey(mod('item_singleskill', [54, 3], ''), 'item_singleskill{149}')).toBe(false);
    expect(modMatchesStatKey(mod('fireresist', [30], ''), 'fireresist|all_resist')).toBe(true);
  });

  it('mergeDamageLines: a min and a max damage line → one "Adds X-Y Damage" line at the first one', () => {
    const minLine = mod('min_damage', [9], '+9 to Minimum Damage', { min: 5, max: 10 });
    const maxLine = mod('maxdamage', [15], '+15 to Maximum Damage', { min: 10, max: 20, corrupted: true });
    const str = mod('strength', [20], '+20 to Strength');
    const [merged, rest] = mergeDamageLines([minLine, str, maxLine]);
    expect(merged).toMatchObject({
      name: 'damage',
      values: [9, 15],
      label: 'Adds 9-15 Damage',
      priority: minLine.priority,
      corrupted: true,
      // The pair's roll range is the max line's
      min: 10,
      max: 20,
      parts: [minLine, maxLine],
    });
    expect(rest).toBe(str);
    expect(mergeDamageLines([maxLine, minLine])[0].label).toBe('Adds 9-15 Damage');
    expect(mergeDamageLines([mod('min_damage', [7], ''), mod('max_damage', [7], '')])[0].label).toBe('+7 Damage');
  });

  it('mergeDamageLines leaves a lone line (or a min above the max) as is', () => {
    const minLine = mod('min_damage', [9], '+9 to Minimum Damage');
    const str = mod('strength', [20], '+20 to Strength');
    expect(mergeDamageLines([minLine, str])).toEqual([minLine, str]);
    const maxLine = mod('max_damage', [15], '+15 to Maximum Damage');
    expect(mergeDamageLines([maxLine])).toEqual([maxLine]);
    const high = mod('min_damage', [20], '+20 to Minimum Damage');
    expect(mergeDamageLines([high, maxLine])).toEqual([high, maxLine]);
  });

  it('cards and tooltips show the merged pair; a damage filter highlights it', () => {
    const axe = item({
      corruptions: ['max_damage'],
      modifiers: [
        mod('corrupted', [0, 20], 'Corrupted'),
        mod('strength', [20], '+20 to Strength'),
        mod('max_damage', [14], '+14 to Maximum Damage'),
        mod('min_damage', [4], '+4 to Minimum Damage'),
      ],
    });
    expect(displayMods(axe).map((m) => m.label)).toEqual(['+20 to Strength', 'Adds 4-14 Damage']);
    const line = buildCardModel(axe).mods[1];
    expect(line).toMatchObject({ label: 'Adds 4-14 Damage', corrupted: true, own: null, sources: [] });
    expect(modMatchesStatKey(line.mod, 'damage{4..}')).toBe(true);
    expect(modMatchesStatKey(line.mod, 'damage{5..}')).toBe(false);
    expect(modMatchesStatKey(line.mod, 'max_damage|maxdamage')).toBe(true);
    expect(modMatchesStatKey(line.mod, 'strength')).toBe(false);
    // A lone line under a damage filter: its half of the pair
    expect(modMatchesStatKey(mod('min_damage', [4], ''), 'damage{4..}')).toBe(true);
    expect(modMatchesStatKey(mod('min_damage', [3], ''), 'damage{4..}')).toBe(false);
    expect(modMatchesStatKey(mod('maxdamage', [9], ''), 'damage')).toBe(true);
  });
});
