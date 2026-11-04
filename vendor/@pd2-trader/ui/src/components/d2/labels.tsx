import { createContext, useContext, type ReactNode } from 'react';

import type { D2Class, Element, EquipSlot, RuneTier } from './data';
import type { QualityKey } from './quality-badge';

/**
 * Game strings the D2 components render themselves (tooltip lines, slot names, mode chips). English defaults match
 * the game client; the app passes its translations through `D2LabelsProvider` next to `UiLabelsProvider`.
 * Numbers arrive already locale-formatted.
 */
export interface D2Labels {
  quality: (quality: QualityKey) => string;
  className: (cls: D2Class) => string;
  /** "Level 92". */
  level: (level: string) => string;
  ladder: string;
  nonLadder: string;
  softcore: string;
  hardcore: string;
  /** Chip forms of ModeBadge `size="short"`. */
  ladderShort: string;
  nonLadderShort: string;
  softcoreShort: string;
  hardcoreShort: string;
  classic: string;
  season: (season: string) => string;
  seasonShort: (season: string) => string;
  dead: string;
  /** ItemTooltip lines. */
  defense: string;
  oneHandDamage: string;
  twoHandDamage: string;
  throwDamage: string;
  durability: (current: string, max: string) => string;
  requiredLevel: (level: string) => string;
  requiredStrength: (value: string) => string;
  requiredDexterity: (value: string) => string;
  itemLevel: (level: string) => string;
  ethereal: string;
  /** Chip form ("Ethereal"). */
  etherealShort: string;
  socketed: (count: string) => string;
  corrupted: string;
  unidentified: string;
  /** Set bonus requirement ("(2 Items)"). */
  setPieces: (count: string) => string;
  emptySocket: string;
  /** Empty equipment slot in the row layout. */
  empty: string;
  slot: (slot: EquipSlot) => string;
  element: (element: Element) => string;
  affix: (kind: 'prefix' | 'suffix' | 'implicit' | 'crafted' | 'corrupted' | 'enchant') => string;
  breakpointKind: (kind: 'FCR' | 'FHR' | 'FBR' | 'IAS') => string;
  frames: (frames: string) => string;
  framesShort: (frames: string) => string;
  /** BreakpointTable: "+12% to next". */
  toNext: (value: string) => string;
  maxed: string;
  runes: string;
  runeTier: (tier: RuneTier) => string;
  /** "84 listings". */
  listings: (count: string) => string;
  /** Hidden overflow count ("+2 more"). */
  more: (count: string) => string;
  sockets: (count: string) => string;
  /** Map tier chip ("T3"). */
  tier: (tier: 1 | 2 | 3) => string;
  corruptedZone: string;
  offerStatus: (status: 'pending' | 'accepted' | 'declined' | 'countered' | 'expired') => string;
  online: string;
  away: string;
  offline: string;
  mercenary: string;
  /** "Act 2". */
  act: (act: string) => string;
  /** ResistanceBar title: "+23 over cap". */
  overCap: (value: string) => string;
  /** ResistanceBar title: "Max 75". */
  maxRes: (value: string) => string;
  /** UberProgress: "2 runs". */
  runsReady: (count: string) => string;
  /** PriceHistoryChart: price series and volume names. */
  price: string;
  volume: string;
}

const SLOT_NAMES: Record<EquipSlot, string> = {
  helm: 'Helm',
  amulet: 'Amulet',
  weapon: 'Weapon',
  armor: 'Armor',
  offhand: 'Off-hand',
  'ring-right': 'Ring',
  'ring-left': 'Ring',
  belt: 'Belt',
  gloves: 'Gloves',
  boots: 'Boots',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const DEFAULT_D2_LABELS: D2Labels = {
  quality: capitalize,
  className: capitalize,
  level: (level) => `Level ${level}`,
  ladder: 'Ladder',
  nonLadder: 'Non-ladder',
  softcore: 'Softcore',
  hardcore: 'Hardcore',
  ladderShort: 'L',
  nonLadderShort: 'NL',
  softcoreShort: 'SC',
  hardcoreShort: 'HC',
  classic: 'Classic',
  season: (season) => `Season ${season}`,
  seasonShort: (season) => `S${season}`,
  dead: 'Dead',
  defense: 'Defense',
  oneHandDamage: 'One-Hand Damage',
  twoHandDamage: 'Two-Hand Damage',
  throwDamage: 'Throw Damage',
  durability: (current, max) => `Durability: ${current} of ${max}`,
  requiredLevel: (level) => `Required Level: ${level}`,
  requiredStrength: (value) => `Required Strength: ${value}`,
  requiredDexterity: (value) => `Required Dexterity: ${value}`,
  itemLevel: (level) => `Item Level: ${level}`,
  ethereal: 'Ethereal (Cannot be Repaired)',
  etherealShort: 'Ethereal',
  socketed: (count) => `Socketed (${count})`,
  corrupted: 'Corrupted',
  unidentified: 'Unidentified',
  setPieces: (count) => `(${count} Items)`,
  emptySocket: 'Empty socket',
  empty: 'Empty',
  slot: (slot) => SLOT_NAMES[slot],
  element: capitalize,
  affix: (kind) => (kind === 'corrupted' ? 'Corrupt' : capitalize(kind)),
  breakpointKind: (kind) =>
    ({ FCR: 'Faster Cast Rate', FHR: 'Faster Hit Recovery', FBR: 'Faster Block Rate', IAS: 'Increased Attack Speed' })[
      kind
    ],
  frames: (frames) => `${frames} frames`,
  framesShort: (frames) => `${frames}f`,
  toNext: (value) => `+${value}% to next`,
  maxed: 'Max breakpoint',
  runes: 'Runes',
  runeTier: (tier) => `${capitalize(tier)} runes`,
  listings: (count) => `${count} listings`,
  more: (count) => `+${count} more`,
  sockets: (count) => (count === '1' ? '1 socket' : `${count} sockets`),
  tier: (tier) => `T${tier}`,
  corruptedZone: 'Corrupted zone',
  offerStatus: capitalize,
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
  mercenary: 'Mercenary',
  act: (act) => `Act ${act}`,
  overCap: (value) => `+${value} over cap`,
  maxRes: (value) => `Max ${value}`,
  runsReady: (count) => (count === '1' ? '1 run' : `${count} runs`),
  price: 'Price',
  volume: 'Listings',
};

const D2LabelsContext = createContext<D2Labels>(DEFAULT_D2_LABELS);

/** Supplies translated game strings to the D2 components; unset keys keep the English defaults. */
export function D2LabelsProvider({ labels, children }: { labels: Partial<D2Labels>; children: ReactNode }) {
  return <D2LabelsContext.Provider value={{ ...DEFAULT_D2_LABELS, ...labels }}>{children}</D2LabelsContext.Provider>;
}

export function useD2Labels(): D2Labels {
  return useContext(D2LabelsContext);
}
