import {
  type BuildsFilters,
  type BuildsMode,
  type CharacterSkill,
  EMPTY_BUILDS_FILTERS,
  type EquippedItem,
  type ItemUsage,
  type Merc,
} from '@/lib/builds-api';
import { skillFilter, SKILL_MAX_POINTS } from './format';

/** Items worn by at least this share (%) of a group make its "core kit". */
export const CORE_SHARE = 25;
/** Fewer peers than this: the gear-up compares against the whole class instead. */
export const MIN_PEERS = 5;

/** Summed price of the priced items worn by ≥ CORE_SHARE % (optionally only those `include` keeps). */
export function coreKitTotal(items: ItemUsage[], include: (item: ItemUsage) => boolean = () => true): number {
  let sum = 0;
  for (const item of items) if (item.pct >= CORE_SHARE && item.priceHr != null && include(item)) sum += item.priceHr;
  return Math.round(sum * 100) / 100;
}

/** Item keys a build wears, character and merc (the keys usage/shopping lists use). */
export function wornKeys(build: {
  equipped: Pick<EquippedItem, 'key'>[];
  merc: Pick<Merc<Pick<EquippedItem, 'key'>>, 'equipped'> | null;
}): Set<string> {
  return new Set([...build.equipped, ...(build.merc?.equipped ?? [])].map((item) => item.key));
}

/** "Missing core items ≈ X HR": the core items (≥ CORE_SHARE %) the build doesn't wear. */
export const missingCoreTotal = (items: ItemUsage[], worn: Set<string>) =>
  coreKitTotal(items, (item) => !worn.has(item.key));

/**
 * Skills that can define the build, best first: most hard points, then highest total. The first is the build's
 * signature (a maxed skill when it has one).
 */
export function signatureSkills(skills: CharacterSkill[], limit = 6): CharacterSkill[] {
  return [...skills]
    .filter((s) => s.base > 0 || s.total > 0)
    .sort((a, b) => b.base - a.base || b.total - a.total)
    .slice(0, limit);
}

/** Characters like this one: same class, the skill maxed (classOnly: the whole class). */
export function peerFilters(
  className: string,
  skill: string | null,
  mode: BuildsMode,
  classOnly = false,
): BuildsFilters {
  return {
    ...EMPTY_BUILDS_FILTERS,
    mode,
    classes: [className],
    skills: skill && !classOnly ? [skillFilter(skill)] : [],
  };
}

/** Whether the character has maxed a skill (hard points), by name. */
export function isMaxed(skills: CharacterSkill[], name: string): boolean {
  return (skills.find((s) => s.name === name)?.base ?? 0) >= SKILL_MAX_POINTS;
}
