/**
 * Which stash items a character can wear right now, for Net Worth → Simulator's "Pick what fits": class-only bases,
 * the required level, and required Strength / Dexterity against the character's (PD2's last save).
 */
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { CharacterItems } from '@/lib/builds-api';

/** Base type codes only one class can use. */
const CLASS_TYPES: Record<string, string> = {
  abow: 'Amazon',
  aspe: 'Amazon',
  ajav: 'Amazon',
  h2h: 'Assassin',
  h2h2: 'Assassin',
  phlm: 'Barbarian',
  pelt: 'Druid',
  head: 'Necromancer',
  ashd: 'Paladin',
  orb: 'Sorceress',
};

/** Charms count while they sit in the inventory. */
const CHARM_TYPES: Record<string, true> = { scha: true, mcha: true, lcha: true };

/** What the fit check compares requirements against. */
export interface FitCharacter {
  className: string;
  level: number;
  /** With the Strength / Dexterity the worn gear (not the weapon switch) and inventory charms add. */
  strength: number;
  dexterity: number;
}

function attributeBonus(item: GameStashItem, name: 'strength' | 'dexterity'): number {
  let total = 0;
  for (const mod of item.modifiers ?? []) {
    if (mod.name === name || mod.name === 'all_attributes') total += Number(mod.values?.[0]) || 0;
  }
  return total;
}

function counts(item: GameStashItem): boolean {
  const { zone, storage, equipment } = item.location ?? ({} as GameStashItem['location']);
  if (zone === 'Equipped') return !String(equipment ?? '').endsWith('Switch');
  return storage === 'Inventory' && CHARM_TYPES[item.base?.type_code ?? ''] === true;
}

/** The character as the fit check sees it; null when PD2 sent no stats for it. */
export function fitCharacter({ items, stats }: CharacterItems): FitCharacter | null {
  if (!stats) return null;
  const worn = items.filter(counts);
  return {
    className: stats.className,
    level: stats.level,
    strength: stats.strength + worn.reduce((sum, item) => sum + attributeBonus(item, 'strength'), 0),
    dexterity: stats.dexterity + worn.reduce((sum, item) => sum + attributeBonus(item, 'dexterity'), 0),
  };
}

/** The class that alone can use `item`'s base; null when every class can. */
export function itemClass(item: GameStashItem): string | null {
  return CLASS_TYPES[item.base?.type_code ?? ''] ?? null;
}

/** Why `character` can't wear `item` now (the first unmet requirement, short: 'needs Str 170 · has 125'); null if it can. */
export function unfitReason(item: GameStashItem, character: FitCharacter): string | null {
  const only = itemClass(item);
  if (only && only.toLowerCase() !== character.className.toLowerCase()) return `${only} only`;
  const req = item.requirements ?? ({} as GameStashItem['requirements']);
  const level = Number(req.level) || 0;
  if (level > character.level) return `needs level ${level} · is ${character.level}`;
  const strength = Number(req.strength) || 0;
  if (strength > character.strength) return `needs Str ${strength} · has ${character.strength}`;
  const dexterity = Number(req.dexterity) || 0;
  if (dexterity > character.dexterity) return `needs Dex ${dexterity} · has ${character.dexterity}`;
  return null;
}

/** The hashes of the first `max` items (in list order) `character` can wear. */
export function pickFitting(items: readonly GameStashItem[], character: FitCharacter, max: number): Set<string> {
  const picked = new Set<string>();
  for (const item of items) {
    if (picked.size >= max) break;
    if (unfitReason(item, character) === null) picked.add(item.hash);
  }
  return picked;
}
