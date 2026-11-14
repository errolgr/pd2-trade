/**
 * Several Type options at once (Polearm + Spears, Fist Weapon + Dagger). The selection travels as the one Type value
 * the market service, saved searches, presets and site links already take: a single option keeps its own code, and
 * several become the `{"$in": [...]}` of every raw type code they stand for (type groups expanded, the service only
 * expands a lone `group:<id>`). A Type value is read back into options by covering its codes with the fewest options.
 */
import { basesForType, type CatalogOption, findTypeOption, optionCodes, TYPE_OPTIONS } from './catalog';
import { inCodes, isTypeGroupCode, typeGroupOf } from './type-groups';

const OPTION_ORDER = new Map(TYPE_OPTIONS.map((o, i) => [o.code, i]));

/** Options to cover codes with: groups and grouped types (more codes) before the types they hold. */
const BY_SIZE = [...TYPE_OPTIONS]
  .map((o) => ({ code: o.code, codes: optionCodes(o.code) }))
  .filter((o) => o.codes.length > 0)
  .sort((a, b) => b.codes.length - a.codes.length);

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
 * for last), so the same picks always make the same value.
 */
export function typeCodeForSelection(selection: readonly string[]): string | undefined {
  const order = (code: string) => OPTION_ORDER.get(code) ?? OPTION_ORDER.size;
  const unique = [...new Set(selection)].sort((a, b) => order(a) - order(b));
  if (unique.length <= 1) return unique[0];
  const codes = [...new Set(unique.flatMap(optionCodes))];
  // Codes are unique, so the same count and every one of them is the same set
  const exact = BY_SIZE.find((o) => o.codes.length === codes.length && o.codes.every((c) => codes.includes(c)));
  return exact?.code ?? inCodes(codes);
}

/** The Type value for raw type codes (a PD2 query's `$in`): the option standing for exactly them, else the options covering them. */
export function typeCodeForCodes(codes: readonly string[]): string | undefined {
  return typeCodeForSelection(typeSelection(codes.length === 1 ? codes[0] : inCodes(codes)));
}

/** Whether a Type option shows as picked: selected itself, or a member type of a selected group. */
export function isTypeSelected(selection: readonly string[], code: string): boolean {
  if (selection.includes(code)) return true;
  const group = typeGroupOf(code);
  return !!group && selection.includes(group.code);
}

/**
 * The Type value after ticking or unticking one option. Removing a member type of a selected group
 * keeps the group's other members; adding a group takes in its members picked one by one.
 */
export function toggleTypeOption(typeCode: string | undefined, code: string): string | undefined {
  const selection = typeSelection(typeCode);
  const group = typeGroupOf(code);
  let next: string[];
  if (selection.includes(code)) next = selection.filter((c) => c !== code);
  else if (group && selection.includes(group.code))
    next = [
      ...selection.filter((c) => c !== group.code),
      ...group.members.filter((m) => m !== code && OPTION_ORDER.has(m)),
    ];
  else if (isTypeGroupCode(code)) {
    const members = optionCodes(code);
    next = [...selection.filter((c) => !members.includes(c)), code];
  } else next = [...selection, code];
  return typeCodeForSelection(next);
}

/**
 * A Type value as text: its options' labels ("Polearm, Spears"), a raw type code no option stands for by the
 * option holding it (`lcha` → Charm); undefined for none.
 */
export function typeLabel(typeCode: string | undefined): string | undefined {
  const selection = typeSelection(typeCode);
  return selection.length ? selection.map((code) => findTypeOption(code)?.label ?? code).join(', ') : undefined;
}

/** The Base select for a Type value: `basesForType`, or for several options all of theirs, sorted by label. */
export function basesForTypeValue(typeCode: string | undefined): CatalogOption[] {
  const selection = typeSelection(typeCode);
  if (selection.length <= 1) return basesForType(typeCode);
  const bases = new Map(selection.flatMap(basesForType).map((b) => [b.code, b]));
  return [...bases.values()].sort((a, b) => a.label.localeCompare(b.label));
}
