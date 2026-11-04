/**
 * Game constants the D2 components share: classes, elements, equipment slots, the rune order and the uber chain.
 * Pure data, no React.
 */

export const D2_CLASSES = ['amazon', 'assassin', 'barbarian', 'druid', 'necromancer', 'paladin', 'sorceress'] as const;
export type D2Class = (typeof D2_CLASSES)[number];

/** "Sorceress", "sorc", "Sorc", "necro" → the class id; null for anything else. */
export function toD2Class(name: string | null | undefined): D2Class | null {
  const n = String(name ?? '')
    .trim()
    .toLowerCase();
  if (!n) return null;
  if (n.length < 3) return null;
  return D2_CLASSES.find((c) => c === n || CLASS_ALIASES[n] === c || c.startsWith(n)) ?? null;
}

const CLASS_ALIASES: Record<string, D2Class> = {
  ama: 'amazon',
  zon: 'amazon',
  sin: 'assassin',
  sader: 'paladin',
  pala: 'paladin',
  pally: 'paladin',
  barb: 'barbarian',
  necro: 'necromancer',
  sorc: 'sorceress',
};

/** Class color classes (`class-*` tokens). Lookup maps keep the token names greppable. */
export const CLASS_TEXT: Record<D2Class, string> = {
  amazon: 'text-class-amazon',
  assassin: 'text-class-assassin',
  barbarian: 'text-class-barbarian',
  druid: 'text-class-druid',
  necromancer: 'text-class-necromancer',
  paladin: 'text-class-paladin',
  sorceress: 'text-class-sorceress',
};

export const CLASS_RING: Record<D2Class, string> = {
  amazon: 'ring-class-amazon/50',
  assassin: 'ring-class-assassin/50',
  barbarian: 'ring-class-barbarian/50',
  druid: 'ring-class-druid/50',
  necromancer: 'ring-class-necromancer/50',
  paladin: 'ring-class-paladin/50',
  sorceress: 'ring-class-sorceress/50',
};

export const CLASS_TILE: Record<D2Class, string> = {
  amazon: 'border-class-amazon/60 bg-class-amazon/12 text-class-amazon',
  assassin: 'border-class-assassin/60 bg-class-assassin/12 text-class-assassin',
  barbarian: 'border-class-barbarian/60 bg-class-barbarian/12 text-class-barbarian',
  druid: 'border-class-druid/60 bg-class-druid/12 text-class-druid',
  necromancer: 'border-class-necromancer/60 bg-class-necromancer/12 text-class-necromancer',
  paladin: 'border-class-paladin/60 bg-class-paladin/12 text-class-paladin',
  sorceress: 'border-class-sorceress/60 bg-class-sorceress/12 text-class-sorceress',
};

export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_TEXT: Record<Element, string> = {
  fire: 'text-dmg-fire',
  cold: 'text-dmg-cold',
  lightning: 'text-dmg-lightning',
  poison: 'text-dmg-poison',
};

export const ELEMENT_FILL: Record<Element, string> = {
  fire: 'bg-dmg-fire',
  cold: 'bg-dmg-cold',
  lightning: 'bg-dmg-lightning',
  poison: 'bg-dmg-poison',
};

/** Paper-doll slots in the in-game layout. */
export const EQUIP_SLOTS = [
  'helm',
  'amulet',
  'weapon',
  'armor',
  'offhand',
  'ring-right',
  'belt',
  'ring-left',
  'gloves',
  'boots',
] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** Slot names the PD2 character API sends ("Right Hand Switch") → a paper-doll slot and the weapon set. */
export function toEquipSlot(apiSlot: string): { slot: EquipSlot; weaponSet: 0 | 1 } | null {
  const swap = / Switch$/.test(apiSlot) ? 1 : 0;
  const s = apiSlot.replace(/ Switch$/, '').toLowerCase();
  const slot = (
    {
      helm: 'helm',
      head: 'helm',
      amulet: 'amulet',
      'right hand': 'weapon',
      weapon: 'weapon',
      armor: 'armor',
      'body armor': 'armor',
      'left hand': 'offhand',
      shield: 'offhand',
      'right ring': 'ring-right',
      'left ring': 'ring-left',
      belt: 'belt',
      gloves: 'gloves',
      boots: 'boots',
    } as Record<string, EquipSlot>
  )[s];
  return slot ? { slot, weaponSet: swap } : null;
}

/** All 33 runes in drop order (index + 1 = rune number). */
export const RUNES = [
  'El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn',
  'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um',
  'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod',
] as const; // prettier-ignore

/** 1-based rune number ("Ber" → 30); null for non-runes. */
export function runeNumber(rune: string): number | null {
  const i = (RUNES as readonly string[]).indexOf(rune.replace(/ Rune$/, '').trim());
  return i < 0 ? null : i + 1;
}

/** Trade tiers players use: low El–Dol, mid Hel–Gul, high Vex–Zod. */
export type RuneTier = 'low' | 'mid' | 'high';
export function runeTier(rune: string): RuneTier | null {
  const n = runeNumber(rune);
  if (n === null) return null;
  return n <= 14 ? 'low' : n <= 25 ? 'mid' : 'high';
}
