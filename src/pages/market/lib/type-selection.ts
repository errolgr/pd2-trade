/**
 * Several Type options at once (Polearm + Spears, Fist Weapon + Dagger). The selection travels as the one Type value
 * the market service, saved searches, presets and site links already take: a single option keeps its own code, and
 * several become the `{"$in": [...]}` of every raw type code they stand for (type groups expanded, the service only
 * expands a lone `group:<id>`; weapon groups always expanded, nothing else knows them). A Type value is read back into
 * options by covering its codes with the fewest options.
 *
 * The hand groups (1H, 2H, 2H Melee: weapon groups that take only some bases of a type) need the Base value too: a
 * pick involving one makes the Type value its types and the Base value the `$in` of the bases picked ("picked bases",
 * no Base option stands for them). With picked bases, the Type select works on bases: an option shows as picked when
 * all its bases are, and toggling it adds or removes its bases.
 */
import { t } from '@/i18n';
import { basesForType, type CatalogOption, findTypeOption, ITEM_TYPES, optionCodes, TYPE_OPTIONS } from './catalog';
import { inCodes } from './type-groups';
import { basesOfTypes, isWeaponGroupCode, weaponGroupBases, weaponGroupByCode } from './weapon-groups';

/** The Type and Base values together (the hand groups set both). */
export interface TypeBaseValue {
  typeCode?: string;
  baseCode?: string;
}

const OPTION_ORDER = new Map(TYPE_OPTIONS.map((o, i) => [o.code, i]));

/** Whether an option is a hand group (its types don't say it: it takes only some of their bases). */
const isHandGroup = (code: string) => !!weaponGroupByCode(code)?.bases;

/** Options to cover codes with: groups and grouped types (more codes) before the types they hold; no hand groups. */
const BY_SIZE = [...TYPE_OPTIONS]
  .filter((o) => !isHandGroup(o.code))
  .map((o) => ({ code: o.code, codes: optionCodes(o.code) }))
  .filter((o) => o.codes.length > 0)
  .sort((a, b) => b.codes.length - a.codes.length);

/** Every base code an option stands for. */
function optionBases(code: string): string[] {
  const weapons = weaponGroupByCode(code);
  return weapons ? weaponGroupBases(weapons) : basesOfTypes(optionCodes(code));
}

/** Options to cover picked bases with, the most bases first (hand groups included). */
const BY_BASES = TYPE_OPTIONS.map((o) => ({ code: o.code, bases: optionBases(o.code) }))
  .filter((o) => o.bases.length > 0)
  .sort((a, b) => b.bases.length - a.bases.length);

/**
 * The Type options a Type value selects, in list order: the option itself for an option's code, else the options
 * covering its `$in` codes. A code no option stands for is kept as itself, so changing the selection keeps it.
 */
export function typeSelection(typeCode: string | undefined): string[] {
  if (!typeCode) return [];
  if (OPTION_ORDER.has(typeCode)) return [typeCode];
  const left = new Set(optionCodes(typeCode));
  const picked: string[] = [];
  for (const option of BY_SIZE) {
    if (!option.codes.every((c) => left.has(c))) continue;
    picked.push(option.code);
    for (const c of option.codes) left.delete(c);
  }
  picked.sort((a, b) => OPTION_ORDER.get(a)! - OPTION_ORDER.get(b)!);
  return [...picked, ...left];
}

/**
 * The Type value of selected options: none → undefined, one → its code, several → the option standing for exactly
 * their codes (Bow + Amazon Bow → Bows) if any, else the `$in` of their codes in list order (codes no option stands
 * for last), so the same picks always make the same value. A weapon group is always the `$in` of its types.
 */
export function typeCodeForSelection(selection: readonly string[]): string | undefined {
  const order = (code: string) => OPTION_ORDER.get(code) ?? OPTION_ORDER.size;
  const unique = [...new Set(selection)].sort((a, b) => order(a) - order(b));
  const codes = [...new Set(unique.flatMap(optionCodes))];
  // Codes are unique, so the same count and every one of them is the same set
  const option =
    unique.length <= 1
      ? unique[0]
      : BY_SIZE.find((o) => o.codes.length === codes.length && o.codes.every((c) => codes.includes(c)))?.code;
  if (option !== undefined) return isWeaponGroupCode(option) ? inCodes(optionCodes(option)) : option;
  return codes.length ? inCodes(codes) : undefined;
}

/** The Type value for raw type codes (a PD2 query's `$in`): the option standing for exactly them, else the options covering them. */
export function typeCodeForCodes(codes: readonly string[]): string | undefined {
  return typeCodeForSelection(typeSelection(codes.length === 1 ? codes[0] : inCodes(codes)));
}

/** The Base select for a Type value: `basesForType`, or for several options all of theirs, sorted by label. */
export function basesForTypeValue(typeCode: string | undefined): CatalogOption[] {
  const selection = typeSelection(typeCode);
  if (selection.length <= 1) return basesForType(selection[0]);
  const bases = new Map(selection.flatMap(basesForType).map((b) => [b.code, b]));
  return [...bases.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** The picked bases of a Type + Base value: its Base value's codes when no Base option stands for it, else null. */
export function pickedBases({ typeCode, baseCode }: TypeBaseValue): Set<string> | null {
  if (!baseCode?.startsWith('{') || basesForTypeValue(typeCode).some((b) => b.code === baseCode)) return null;
  return new Set(optionCodes(baseCode));
}

/** The bases a value searches: its Base value's codes, else every base of its types. */
const searchedBases = ({ typeCode, baseCode }: TypeBaseValue): Set<string> =>
  new Set(baseCode ? optionCodes(baseCode) : typeCode ? basesOfTypes(optionCodes(typeCode)) : []);

/**
 * Whether a Type option shows as picked: every type it stands for is (a picked group's types are picked too; picking
 * Melee picks Sword); with picked bases or for a hand group, every base it stands for is (2H Melee picks Polearm).
 */
export function isTypeOptionSelected(value: TypeBaseValue, code: string): boolean {
  const picked = pickedBases(value);
  const [own, selected] =
    picked || isHandGroup(code)
      ? [optionBases(code), picked ?? searchedBases(value)]
      : [optionCodes(code), new Set(value.typeCode ? optionCodes(value.typeCode) : [])];
  return own.length > 0 && own.every((c) => selected.has(c));
}

/** The Type and Base values for the picked bases of raw types: the types alone when every base of them is picked. */
function typeBaseValue(types: Iterable<string>, bases: Set<string>): TypeBaseValue {
  const kept = [...types].filter((type) => basesOfTypes([type]).some((b) => bases.has(b)));
  const typeCode = typeCodeForCodes(kept);
  if (!typeCode) return {};
  const all = basesOfTypes(kept);
  const taken = all.filter((b) => bases.has(b));
  return taken.length === all.length ? { typeCode } : { typeCode, baseCode: inCodes(taken) };
}

/**
 * The Type and Base values after ticking or unticking one Type option. Removing a type under a picked group keeps the
 * group's other types; adding a group takes in its types picked one by one; a picked Base stays while a type still
 * offers it. A hand group, or any option while bases are picked, adds or removes its bases instead (unticking Sword
 * under 1H keeps the other one-handed bases).
 */
export function toggleTypeOption(value: TypeBaseValue, code: string): TypeBaseValue {
  if (isHandGroup(code) || pickedBases(value)) {
    const types = new Set(value.typeCode ? optionCodes(value.typeCode) : []);
    const bases = searchedBases(value);
    const own = optionBases(code);
    if (own.length > 0 && own.every((b) => bases.has(b))) for (const b of own) bases.delete(b);
    else {
      for (const b of own) bases.add(b);
      for (const type of optionCodes(code)) types.add(type);
    }
    return typeBaseValue(types, bases);
  }
  const selection = typeSelection(value.typeCode);
  const codes = new Set(selection.flatMap(optionCodes));
  const own = optionCodes(code);
  let typeCode: string | undefined;
  if (selection.includes(code)) typeCode = typeCodeForSelection(selection.filter((c) => c !== code));
  // Under a picked option (a group's type, Sword under Melee): the rest of that option's types stay
  else if (own.length > 0 && own.every((c) => codes.has(c)))
    typeCode = typeCodeForCodes([...codes].filter((c) => !own.includes(c)));
  // Options the new one holds are taken in by it
  else
    typeCode = typeCodeForSelection([
      ...selection.filter((c) => !optionCodes(c).every((member) => own.includes(member))),
      code,
    ]);
  const keepBase = basesForTypeValue(typeCode).some((b) => b.code === value.baseCode);
  return { typeCode, baseCode: keepBase ? value.baseCode : undefined };
}

/** An option's label, a raw type code no option stands for by the option holding it (`lcha` → Charm). */
const optionLabel = (code: string) => findTypeOption(code)?.label ?? code;

/**
 * A Type value as text: its options' labels ("Polearm, Spears"), a raw type code no option stands for by the
 * option holding it (`lcha` → Charm); undefined for none.
 */
export function typeLabel(typeCode: string | undefined): string | undefined {
  const selection = typeSelection(typeCode);
  return selection.length ? selection.map(optionLabel).join(', ') : undefined;
}

/**
 * A Type + Base value's types as text: `typeLabel`, or with picked bases the options covering them ("1H, Bows") and
 * the types they take only some bases of ("Sword (18 bases)").
 */
export function typeValueLabel(value: TypeBaseValue): string | undefined {
  const picked = pickedBases(value);
  if (!picked) return typeLabel(value.typeCode);
  const left = new Set(picked);
  const covering: string[] = [];
  for (const option of BY_BASES) {
    if (!option.bases.every((b) => left.has(b))) continue;
    covering.push(option.code);
    for (const b of option.bases) left.delete(b);
  }
  covering.sort((a, b) => OPTION_ORDER.get(a)! - OPTION_ORDER.get(b)!);
  const partial = ITEM_TYPES.flatMap((type) => {
    const count = basesOfTypes(optionCodes(type.code)).filter((b) => left.has(b)).length;
    return count ? [t('market:filters.someBases', { type: type.label, count })] : [];
  });
  return [...covering.map(optionLabel), ...partial].join(', ') || undefined;
}

/** A Base value as text: its option's label, picked bases by their count; undefined for none. */
export function baseValueLabel(value: TypeBaseValue): string | undefined {
  if (!value.baseCode) return undefined;
  const picked = pickedBases(value);
  if (picked) return t('market:filters.pickedBases', { count: picked.size });
  return basesForTypeValue(value.typeCode).find((b) => b.code === value.baseCode)?.label ?? value.baseCode;
}
