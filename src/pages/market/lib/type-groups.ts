/**
 * Type groups: a level above the site's item types ("Bows" → Amazon Bow / Bow → Ceremonial Bow), for searches that
 * want every class variant of a kind of item. A group's code (`group:<id>`) goes wherever a Type value goes (the
 * market service's `typeCode`, saved searches, presets), never as a Base value, and means "item type code in its
 * members".
 *
 * The market service (pd2-trader-server `market-listings/filters/catalog.ts`) owns this table and expands the codes
 * it is sent; this is its mirror for the UI. PD2 (its API and website) doesn't know group codes: anything sent there
 * uses the members' `$in` instead (`typeGroupSiteValue`, `typeGroupMembers`).
 */
export interface TypeGroup {
  /** `group:<id>` */
  code: string;
  label: string;
  /** Raw `item.base.type_code`s, the site's own type first. */
  members: readonly string[];
}

export const TYPE_GROUP_PREFIX = 'group:';

export const TYPE_GROUPS: readonly TypeGroup[] = [
  { code: 'group:bows', label: 'Bows', members: ['bow', 'abow'] },
  { code: 'group:spears', label: 'Spears', members: ['spea', 'aspe'] },
  { code: 'group:javelins', label: 'Javelins', members: ['jave', 'ajav'] },
  { code: 'group:helms', label: 'Helms', members: ['helm', 'phlm', 'pelt', 'circ'] },
  { code: 'group:shields', label: 'Shields', members: ['shie', 'ashd', 'head'] },
];

/** A `{"$in": [...]}` select value, written as the site writes its grouped entries. */
export const inCodes = (codes: readonly string[]) => `{"$in": [${codes.map((c) => `"${c}"`).join(', ')}]}`;

/** Whether `code` is a type group code (known or not). */
export const isTypeGroupCode = (code: string | undefined): code is string =>
  !!code && code.startsWith(TYPE_GROUP_PREFIX);

/** The type group of a `group:<id>` code; undefined for an unknown id or any other code. */
export function typeGroupByCode(code: string | undefined): TypeGroup | undefined {
  return isTypeGroupCode(code) ? TYPE_GROUPS.find((g) => g.code === code) : undefined;
}

/** The type group a raw type code (`abow`) belongs to, if any. */
export function typeGroupOf(typeCode: string | undefined): TypeGroup | undefined {
  return typeCode ? TYPE_GROUPS.find((g) => g.members.includes(typeCode)) : undefined;
}

/** The type group whose members are exactly `codes` (in any order), e.g. a PD2 query's `$in: ['abow', 'bow']`. */
export function typeGroupForMembers(codes: readonly string[]): TypeGroup | undefined {
  const set = new Set(codes);
  return TYPE_GROUPS.find((g) => g.members.length === set.size && g.members.every((c) => set.has(c)));
}

/** The raw type codes a group code stands for; empty for an unknown group. */
export function typeGroupMembers(code: string): string[] {
  return [...(typeGroupByCode(code)?.members ?? [])];
}

/** A group as the site's Type value: the `{"$in": [...]}` string of its members. */
export const typeGroupSiteValue = (group: TypeGroup): string => inCodes(group.members);
