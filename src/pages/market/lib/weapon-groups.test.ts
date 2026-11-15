import { describe, expect, it } from 'vitest';
import { optionCodes } from './catalog';
import { SITE_ITEM_TYPES } from './catalog.data';
import {
  basesOfTypes,
  type WeaponGroupId,
  WEAPON_GROUPS,
  weaponGroupBases,
  weaponGroupByCode,
  weaponGroupLabel,
  weaponGroupsOf,
} from './weapon-groups';

/** The market service's cap on the codes of one `{"$in": [...]}` (pd2-trader-server MAX_GROUP_CODES). */
const SERVICE_MAX_CODES = 200;

const group = (id: WeaponGroupId) => WEAPON_GROUPS.find((g) => g.id === id)!;
const has = (id: WeaponGroupId, base: string) => weaponGroupBases(group(id)).includes(base);
/** The groups holding a base, in WEAPON_GROUPS order. */
const groupsOf = (base: string) => WEAPON_GROUPS.filter((g) => weaponGroupBases(g).includes(base)).map((g) => g.id);

describe('weapon groups', () => {
  it('puts each kind of weapon in its hand and class groups', () => {
    // 1H sword (Phase Blade), 2H sword (Colossus Blade)
    expect(groupsOf('7cr')).toEqual(['weapons', '1h', 'melee']);
    expect(groupsOf('7gd')).toEqual(['weapons', '2h', 'melee', '2h-melee']);
    // Bow (Hydra Bow), Amazon bow (Ceremonial Bow), crossbow (Demon Crossbow)
    expect(groupsOf('6lw')).toEqual(['weapons', '2h', 'ranged', '2h-ranged']);
    expect(groupsOf('am7')).toEqual(['weapons', '2h', 'ranged', '2h-ranged']);
    expect(groupsOf('6rx')).toEqual(['weapons', '2h', 'ranged', '2h-ranged']);
    // Javelins and throwing weapons are thrown and swung: Ranged and Melee
    expect(groupsOf('7ja')).toEqual(['weapons', '1h', 'melee', 'ranged', '1h-ranged']);
    expect(groupsOf('ama')).toEqual(['weapons', '1h', 'melee', 'ranged', '1h-ranged']);
    expect(groupsOf('7tk')).toEqual(['weapons', '1h', 'melee', 'ranged', '1h-ranged']);
    // Polearm (Thresher is a scythe; Giant Thresher too), staff, wand, scepter
    expect(groupsOf('7pa')).toEqual(['weapons', '2h', 'melee', '2h-melee']);
    expect(groupsOf('7s8')).toEqual(['weapons', '2h', 'melee', '2h-melee']);
    expect(groupsOf('6ws')).toEqual(['weapons', '2h', 'melee', '2h-melee']);
    expect(groupsOf('7gw')).toEqual(['weapons', '1h', 'melee']);
    expect(groupsOf('7ws')).toEqual(['weapons', '1h', 'melee']);
    // Claws and katars (both Fist Weapon types), orbs, hammers by hand
    expect(groupsOf('7wb')).toEqual(['weapons', '1h', 'melee']);
    expect(groupsOf('skr')).toEqual(['weapons', '1h', 'melee']);
    expect(groupsOf('obf')).toEqual(['weapons', '1h', 'melee']);
    expect(groupsOf('7wh')).toEqual(['weapons', '1h', 'melee']);
    expect(groupsOf('7gm')).toEqual(['weapons', '2h', 'melee', '2h-melee']);
    // The 2H Crystal Sword type's Phase Blade, and a stacked Glaive
    expect(groupsOf('7cr2')).toEqual(['weapons', '2h', 'melee', '2h-melee']);
    expect(groupsOf('glvs')).toEqual(['weapons', '1h', 'melee', 'ranged', '1h-ranged']);
    // Not weapons
    expect(groupsOf('uap')).toEqual([]);
    expect(groupsOf('uit')).toEqual([]);
  });

  it('splits a type by hands only where the game does: swords, axes, hammers', () => {
    expect(group('2h').bases).toBeDefined();
    expect(group('2h-melee').bases).toBeDefined();
    expect(group('1h').bases).toBeDefined();
    for (const id of ['weapons', 'melee', 'ranged', '1h-ranged', '2h-ranged'] as const)
      expect(group(id).bases).toBeUndefined();
    expect(group('1h-ranged').types).toEqual(['ajav', 'jave', 'taxe', 'tkni']);
    expect(group('2h-ranged').types).toEqual(['abow', 'bow', 'xbow']);
    expect(has('1h', '9bt')).toBe(false); // Tabar
    expect(has('2h', '9bt')).toBe(true);
    expect(has('1h', 'hax')).toBe(true); // Hand Axe
    expect(has('2h', 'hax')).toBe(false);
  });

  it('covers every weapon base exactly once by hands, and fits the service in one search', () => {
    const all = weaponGroupBases(group('weapons'));
    const one = weaponGroupBases(group('1h'));
    const two = weaponGroupBases(group('2h'));
    expect(one).toHaveLength(157);
    expect(two).toHaveLength(136);
    expect(weaponGroupBases(group('2h-melee'))).toHaveLength(94);
    expect([...one, ...two].sort()).toEqual([...all].sort());
    // Melee + Ranged is every weapon; their overlap is the throwing weapons
    const melee = new Set(weaponGroupBases(group('melee')));
    const ranged = weaponGroupBases(group('ranged'));
    expect(new Set([...melee, ...ranged])).toEqual(new Set(all));
    expect(ranged.filter((b) => melee.has(b))).toEqual(basesOfTypes(group('1h-ranged').types));
    // What a group sends: its types, and its bases when it splits a type
    for (const g of WEAPON_GROUPS) {
      expect(g.types.length).toBeLessThanOrEqual(SERVICE_MAX_CODES);
      expect(g.bases?.length ?? 0).toBeLessThanOrEqual(SERVICE_MAX_CODES);
    }
    // Every weapon type of the site's Type list
    const weaponTypes = SITE_ITEM_TYPES.filter((t) =>
      optionCodes(t.code).some((c) => group('weapons').types.includes(c)),
    );
    expect(weaponTypes.map((t) => t.label)).toContain('Scythe');
    expect(basesOfTypes(weaponTypes.flatMap((t) => optionCodes(t.code)))).toEqual(all);
  });

  it('widens an item to its hand count within its class, its class, then Weapons', () => {
    const ids = (type: string, base?: string) => weaponGroupsOf(type, base).map((g) => g.id);
    expect(ids('swor', '7gd')).toEqual(['2h-melee', 'melee', 'weapons']);
    expect(ids('swor', '7cr')).toEqual(['1h', 'melee', 'weapons']);
    expect(ids('abow', 'am7')).toEqual(['2h-ranged', 'ranged', 'weapons']);
    expect(ids('xbow', '6rx')).toEqual(['2h-ranged', 'ranged', 'weapons']);
    expect(ids('ajav', 'ama')).toEqual(['1h-ranged', 'ranged', 'weapons']);
    expect(ids('pole', '7pa')).toEqual(['2h-melee', 'melee', 'weapons']);
    expect(ids('h2h2', '7wb')).toEqual(['1h', 'melee', 'weapons']);
    expect(ids('helm', 'uap')).toEqual([]);
  });

  it('finds a group by its code and names it in the app language', () => {
    expect(weaponGroupByCode('weapons:2h-melee')?.id).toBe('2h-melee');
    expect(weaponGroupByCode('weapons:nope')).toBeUndefined();
    expect(weaponGroupByCode('group:bows')).toBeUndefined();
    expect(weaponGroupLabel(group('2h-melee'))).toBe('2H Melee');
    expect(weaponGroupLabel(group('weapons'))).toBe('Weapons');
  });
});
