import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { jewelElement, type JewelElement } from '@/pages/chat/lib/listing-art';
import { findTypeOption, optionCodes } from './catalog';
import { parseStatKey } from './stats';

/** Catalog type labels that read wrong as an equipment slot. */
const SLOT_RENAMES: Record<string, string> = { Armor: 'Body Armor' };

/**
 * The item's slot / type as a short label ("Helm", "Ring", "Grand Charm", "Two-Hand Sword"): the site catalog's
 * Type label for its `base.type_code`; grouped types (Jewelry, Charm…) name the member by its base ("Ring").
 * Null when unknown or when the title already says it.
 */
export function itemSlotLabel(item: Pick<ItemDetail, 'name' | 'base' | 'damage'>): string | null {
  const typeCode = item.base?.type_code;
  const type = typeCode ? findTypeOption(typeCode) : null;
  if (!type) return null;
  const grouped = optionCodes(type.code).length > 1 || type.code.startsWith('{');
  const label = grouped ? item.base?.name : (SLOT_RENAMES[type.label] ?? type.label);
  if (!label || item.name.toLowerCase().includes(label.toLowerCase())) return null;
  const hand = item.damage?.two_handed ? 'Two-Hand' : item.damage?.one_handed ? 'One-Hand' : null;
  return hand && !grouped ? `${hand} ${label}` : label;
}

/*
 * Pure view model of the full-width result card: socketed items grouped, each item mod split into the item's own
 * roll and what its sockets add, roll % of the own part, per-level mods. Verified against live PD2 listings:
 * - `item.modifiers` already holds the merged totals (Windforce `maxdamage_percent` 530 = own 350 + 4 × Ohm 45);
 *   `item.socketed[i].modifiers` holds each socketed item's own lines with the same names/values layout.
 * - Proc / skill mods merge by their params and sum the last value (2 facets' 100% Nova on level-up → 200%).
 * - Two-value damage pairs (`firedam [19, 14]`, `lightmindam [2, 74]`) don't sum consistently, so they are
 *   never attributed: no split is better than a wrong one.
 */

/** Mods whose leading values are params (skill, level, class, tab…) and whose LAST value is the amount. */
const PARAM_MODS =
  /^item_(skillon\w+|singleskill|nonclassskill|aura|addclassskills|addskill_tab|charged_skill|elemskill_\w+)$/;

/** The index of a mod's summable amount, or null when its values can't be split reliably. */
export function amountIndex(mod: Pick<Modifier, 'name' | 'values'>): number | null {
  const n = mod.values?.length ?? 0;
  if (n === 0) return null;
  if (n === 1) return 0;
  // `[total, own]` on the item, `[x, x]` on jewels: the first value sums
  if (mod.name === 'maxdamage_percent') return 0;
  if (PARAM_MODS.test(mod.name)) return n - 1;
  return null;
}

/** Same stat line: same name and the same params (all values but the amount). */
function sameLine(a: Pick<Modifier, 'name' | 'values'>, b: Pick<Modifier, 'name' | 'values'>, index: number): boolean {
  if (a.name !== b.name) return false;
  if (index === 0) return true;
  return a.values.slice(0, index).every((v, i) => b.values[i] === v);
}

const PER_LEVEL = /\s*\(Based on Character Level\)/i;

/** "+16 to Maximum Damage (Based on Character Level)" → label without the suffix, flagged per level. */
export function perLevelLabel(label: string): { label: string; perLevel: boolean } {
  return PER_LEVEL.test(label)
    ? { label: label.replace(PER_LEVEL, '').trim(), perLevel: true }
    : { label, perLevel: false };
}

/** Does stat-filter key `key` (site grammar, e.g. `item_singleskill{54}`) select this mod line? */
export function modMatchesStatKey(mod: Pick<Modifier, 'name' | 'values'>, key: string): boolean {
  const { names, params } = parseStatKey(key);
  return names.includes(mod.name) && params.every((p, i) => mod.values?.[i] === p);
}

export interface SocketGroup {
  /** Stable id: name + exact mods. */
  key: string;
  name: string;
  /** Socketed items in this group (identical name and mods). */
  items: ItemDetail[];
  /** 0-based socket positions, in socket order. */
  sockets: number[];
  /** Mods of one item of the group. */
  mods: Modifier[];
  /** Tells same-named groups apart: element / trigger ("Fire · on death"). */
  subtitle: string | null;
  /** Rainbow Facets: their element (art and name colour). */
  element: JewelElement | null;
  /** Per mod: its label for one item and, for 2+, the summed label ("+90% Enhanced Damage"). */
  lines: { each: string; total: string | null }[];
}

export interface ModSource {
  group: number;
  amount: number;
}

export interface CardMod {
  mod: Modifier;
  /** Label without "(Based on Character Level)". */
  label: string;
  perLevel: boolean;
  corrupted: boolean;
  /** What sockets add to this line (empty for runewords and lines that can't be split). */
  sources: ModSource[];
  /** The item's own part when sources were split off (null: not split). */
  own: number | null;
  /** How the own part is named: a ranged roll, a corruption, or a plain base value. */
  ownKind: 'roll' | 'corruption' | 'base' | null;
  /** The line comes from sockets only. */
  socketOnly: boolean;
}

export interface CardModel {
  mods: CardMod[];
  groups: SocketGroup[];
  /** Socket index → group index (socket order). */
  socketGroups: number[];
  emptySockets: number;
  /** Some socketed item lists a bonus: the card shows its Socketed section (else the `Nos` pill says enough). */
  showSockets: boolean;
}

const ELEMENT_LABELS: Record<JewelElement, string> = {
  fire: 'Fire',
  cold: 'Cold',
  lightning: 'Lightning',
  poison: 'Poison',
};
const TRIGGERS: [RegExp, string][] = [
  [/skillondeath/, 'on death'],
  [/skillonlevelup/, 'on level-up'],
  [/skillonhit/, 'on striking'],
  [/skillongethit/, 'when struck'],
  [/skillonattack/, 'on attack'],
  [/skillonkill/, 'on kill'],
];

function facetSubtitle(mods: Modifier[]): string | null {
  const element = jewelElement(mods);
  const names = mods.map((m) => m.name).join(' ');
  const trigger = TRIGGERS.find(([re]) => re.test(names))?.[1];
  const parts = [element && ELEMENT_LABELS[element], trigger].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** The label with its amount multiplied by `count` ("+45% Enhanced Damage" × 2 → "+90% Enhanced Damage"). */
export function multipliedLabel(mod: Modifier, count: number): string | null {
  const index = amountIndex(mod);
  if (index === null) return null;
  const amount = mod.values[index];
  const token = new RegExp(`(?<![\\d.])${String(Math.abs(amount)).replace('.', '\\.')}(?![\\d.])`);
  if (!token.test(mod.label)) return null;
  const total = Math.round(Math.abs(amount) * count * 100) / 100;
  return mod.label.replace(token, String(total));
}

const modsKey = (mods: Modifier[] | undefined) => JSON.stringify((mods ?? []).map((m) => [m.name, m.values]));

/** Socket items whose only bonus is an item flag, which PD2 does not list as a modifier. */
const FLAG_ONLY_BONUS: Record<string, string> = { 'Zod Rune': 'Indestructible' };

/** Group socketed items by name + exact mods, in order of first socket. */
export function groupSockets(socketed: ItemDetail[]): { groups: SocketGroup[]; socketGroups: number[] } {
  const groups: SocketGroup[] = [];
  const socketGroups: number[] = [];
  socketed.forEach((item, socket) => {
    const key = `${item.name}|${modsKey(item.modifiers)}`;
    let index = groups.findIndex((g) => g.key === key);
    if (index < 0) {
      index = groups.length;
      groups.push({
        key,
        name: item.name,
        items: [],
        sockets: [],
        mods: (item.modifiers ?? []).filter((m) => m.name !== 'corrupted'),
        subtitle: null,
        element: item.name === 'Rainbow Facet' ? jewelElement(item.modifiers) : null,
        lines: [],
      });
    }
    groups[index].items.push(item);
    groups[index].sockets.push(socket);
    socketGroups.push(index);
  });
  for (const group of groups) {
    const count = group.items.length;
    group.lines = group.mods.map((m) => ({ each: m.label, total: count > 1 ? multipliedLabel(m, count) : null }));
    // PD2 sends no modifiers for flag-only bonuses (Zod's Indestructible lives on the parent item)
    if (group.lines.length === 0 && FLAG_ONLY_BONUS[group.name]) {
      group.lines = [{ each: FLAG_ONLY_BONUS[group.name], total: null }];
    }
    const sameName = groups.filter((g) => g.name === group.name).length > 1;
    if (sameName || /Facet/.test(group.name)) group.subtitle = facetSubtitle(group.mods);
  }
  return { groups, socketGroups };
}

/** Item mods in game order (priority), without the bare "Corrupted" marker. */
function orderedMods(item: Pick<ItemDetail, 'modifiers'>): Modifier[] {
  return (item.modifiers ?? []).filter((m) => m.name !== 'corrupted').sort((a, b) => b.priority - a.priority);
}

/** Split one item line into its own part and the socket groups' contributions. */
function splitMod(
  mod: Modifier,
  groups: SocketGroup[],
  attribute: boolean,
): Pick<CardMod, 'sources' | 'own' | 'ownKind' | 'socketOnly'> {
  const ranged = typeof mod.min === 'number' && typeof mod.max === 'number';
  // A corrupted line without a range is all corruption; with one, roll and corruption can't be told apart
  const plainKind: CardMod['ownKind'] = mod.corrupted ? (ranged ? 'base' : 'corruption') : ranged ? 'roll' : 'base';
  const index = amountIndex(mod);
  const total = index === null ? null : mod.values[index];
  const unsplit = { sources: [], own: total, ownKind: total === null ? null : plainKind, socketOnly: false };
  if (!attribute || index === null || total === null) return unsplit;

  const sources: ModSource[] = [];
  groups.forEach((group, g) => {
    let amount = 0;
    for (const sm of group.mods) {
      if (amountIndex(sm) === null || !sameLine(mod, sm, index)) continue;
      // Jewel ED is `[x, x]`, the item's `[total, own]`: read the socket's amount at its own index
      amount += sm.values[amountIndex(sm) as number] ?? 0;
    }
    if (amount !== 0) sources.push({ group: g, amount: amount * group.items.length });
  });
  if (!sources.length) return unsplit;

  const own = Math.round((total - sources.reduce((s, x) => s + x.amount, 0)) * 100) / 100;
  // A split that overshoots (or flips sign) means the merge rule differs here: show the total only
  if (Math.sign(own) !== 0 && Math.sign(own) !== Math.sign(total)) return unsplit;
  if (own === 0) return { sources, own: 0, ownKind: null, socketOnly: true };
  return { sources, own, ownKind: plainKind, socketOnly: false };
}

/** Card view model of an item: attributed mods, socket groups, empty sockets, overall roll. */
export function buildCardModel(item: ItemDetail): CardModel {
  const socketed = item.socketed ?? [];
  const { groups, socketGroups } = groupSockets(socketed);
  // Runeword bonuses belong to the runeword (its runes are listed, not credited)
  const attribute = !item.is_runeword && groups.length > 0;

  const mods = orderedMods(item).map((mod): CardMod => {
    const { label, perLevel } = perLevelLabel(mod.label);
    const split = splitMod(mod, groups, attribute);
    return {
      mod,
      label,
      perLevel,
      corrupted: mod.corrupted === true || !!item.corruptions?.includes(mod.name),
      ...split,
    };
  });

  return {
    mods,
    groups,
    socketGroups,
    emptySockets: Math.max(0, (item.socket_count ?? 0) - socketed.length),
    showSockets: groups.some((g) => g.lines.length > 0),
  };
}
