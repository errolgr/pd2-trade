import { PALETTE_GROUPS, type PaletteGroupId, type PaletteItem, type PaletteRef, type PaletteScope } from './types';

/** Recents kept in settings; the empty state shows the first PALETTE_RECENTS_SHOWN not already pinned. */
export const PALETTE_RECENTS_MAX = 20;
export const PALETTE_RECENTS_SHOWN = 6;
/** Items per group: in the mixed list, and when scoped to one group. */
export const PALETTE_MIXED_LIMIT = 4;
export const PALETTE_SCOPED_LIMIT = 30;

/** `ref` moved to the front (newest first), once, capped. */
export function pushRecent(recents: readonly PaletteRef[], ref: PaletteRef): PaletteRef[] {
  return [ref, ...recents.filter((r) => r.id !== ref.id)].slice(0, PALETTE_RECENTS_MAX);
}

export function isPinned(pins: readonly PaletteRef[], id: string): boolean {
  return pins.some((p) => p.id === id);
}

/** Pinned: removed; otherwise appended. */
export function togglePin(pins: readonly PaletteRef[], ref: PaletteRef): PaletteRef[] {
  return isPinned(pins, ref.id) ? pins.filter((p) => p.id !== ref.id) : [...pins, ref];
}

/** The recents the empty state shows: newest first, minus pinned ones. */
export function shownRecents(pins: readonly PaletteRef[], recents: readonly PaletteRef[]): PaletteRef[] {
  return recents.filter((r) => !isPinned(pins, r.id)).slice(0, PALETTE_RECENTS_SHOWN);
}

/** What a group's source resolves on the empty state: its pins, then its shown recents. */
export function refsForGroup(
  pins: readonly PaletteRef[],
  recents: readonly PaletteRef[],
  group: PaletteGroupId,
): PaletteRef[] {
  return [...pins, ...shownRecents(pins, recents)].filter((r) => r.group === group);
}

/**
 * A group's items with the recently picked ones first, newest first; the rest keep the source's order. Then capped.
 */
export function boostRecents(items: readonly PaletteItem[], recents: readonly PaletteRef[], limit: number): PaletteItem[] {
  const rank = new Map(recents.map((r, i) => [r.id, i]));
  return items
    .map((item, order) => ({ item, order, recent: rank.get(item.ref.id) ?? Infinity }))
    .sort((a, b) => a.recent - b.recent || a.order - b.order)
    .slice(0, limit)
    .map((r) => r.item);
}

/**
 * Where Tab takes the palette. A query that starts a group's name ("set", "it") scopes to that group and is
 * cleared; otherwise the highlighted row's group, keeping the query. null: nothing to scope to.
 */
export function tabScope(
  query: string,
  groupLabels: Record<PaletteGroupId, string>,
  highlighted: PaletteGroupId | null,
): { scope: PaletteScope; keepQuery: boolean } | null {
  const q = query.trim().toLowerCase();
  if (q) {
    const named = PALETTE_GROUPS.find((g) => g.startsWith(q) || groupLabels[g].toLowerCase().startsWith(q));
    if (named) return { scope: { group: named }, keepQuery: false };
  }
  return highlighted ? { scope: { group: highlighted }, keepQuery: true } : null;
}

/** The group of a palette item value (`<group>:<key>`); null for the shell's own rows. */
export function groupOfId(id: string): PaletteGroupId | null {
  const group = id.slice(0, id.indexOf(':'));
  return (PALETTE_GROUPS as readonly string[]).includes(group) ? (group as PaletteGroupId) : null;
}
