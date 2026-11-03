import { z } from 'zod';
import type { Permission } from './permissions';
import {
  TONES,
  type BadgeNode,
  type ButtonNode,
  type InlineNode,
  type PriceNode,
  type SectionNode,
  type TextNode,
  type Tone,
  type UiNode,
} from './ui';
import {
  badgeNodeSchema,
  buttonNodeSchema,
  inlineNodeSchema,
  priceNodeSchema,
  textNodeSchema,
  uiNodeSchema,
} from './ui-schema';

// ---------------------------------------------------------------------------------------------------------------
// Data plugins receive. Plain JSON views of host data; host types never leak (they are not a stable contract).
// ---------------------------------------------------------------------------------------------------------------

export interface GameMode {
  ladder: boolean;
  hardcore: boolean;
}

export interface PluginItemStat {
  id: number;
  /** The stat line as the game shows it, e.g. "+2 to All Skills". */
  text: string;
  value?: number;
  corrupted?: boolean;
}

export interface PluginItem {
  /** Unique/set/runeword name, or the base name for other items. */
  name: string;
  /** Base type name (e.g. "Shako"); empty when unknown. */
  base: string;
  /** Lowercase game quality: unique, set, rare, magic, crafted, normal, superior, low quality, rune, runeword… */
  quality: string;
  isRuneword: boolean;
  ethereal: boolean;
  corrupted: boolean;
  sockets: number;
  itemLevel: number;
  stats: PluginItemStat[];
}

export interface CorePrice {
  /** Headline price in HR (high runes); null when the core has no price. */
  medianHr: number | null;
  lowHr: number | null;
  highHr: number | null;
  sampleCount: number;
  change7dPercent: number | null;
}

export interface PriceCheckInput {
  item: PluginItem;
  mode: GameMode;
  price: CorePrice | null;
}

export interface MarketRow {
  id: string;
  name: string;
  base: string;
  quality: string;
  priceHr: number | null;
  priceText: string;
  seller: string;
  online: boolean;
  /** ISO timestamp. */
  listedAt: string;
  stats: PluginItemStat[];
}

export interface MarketQuery extends GameMode {
  itemName?: string;
  source: 'live' | 'archive';
}

export interface MarketInput {
  rows: MarketRow[];
  query: MarketQuery;
}

export interface MarketRowInput {
  row: MarketRow;
  query: MarketQuery;
}

export interface ChatMessage {
  id: string;
  /** whisper/trade: in-game chat log; website: pd2trader.com messages. */
  channel: 'whisper' | 'trade' | 'website';
  direction: 'in' | 'out';
  sender: string;
  text: string;
  /** ISO timestamp. */
  at: string;
  itemName?: string;
  priceText?: string;
}

export interface NetWorthLine {
  name: string;
  category: string;
  qty: number;
  valueHr: number;
}

export interface NetWorthSummary extends GameMode {
  account: string;
  totalHr: number;
  uncertainHr: number;
  gold: number;
  /** ISO timestamp of the snapshot. */
  takenAt: string;
  byCategory: Record<string, number>;
  topLines: NetWorthLine[];
}

export interface TickerInput {
  /** Only with stash:read granted; null otherwise or before the first snapshot. */
  netWorth: NetWorthSummary | null;
}

export interface RunePrice {
  name: string;
  priceHr: number;
  listings: number;
  /** Price is fixed by convention (low runes) rather than observed. */
  fixed: boolean;
}

export interface AccountProfile {
  account: string;
  characters: string[];
}

// ---------------------------------------------------------------------------------------------------------------
// Slots (PRD §6.4): input → output per slot id.
// ---------------------------------------------------------------------------------------------------------------

export interface MarketColumn {
  title: string;
  /** Keyed by MarketRow.id; rows without a cell render empty. */
  cells: Record<string, { text: string; tone?: Tone }>;
}
export interface MarketFilter {
  label: string;
  /** Row ids kept while the user has this filter on. */
  keep: string[];
}
export interface MarketSort {
  label: string;
  /** Higher first; rows without a score sort last. */
  scores: Record<string, number>;
}
export interface ChatDecoration {
  tags: BadgeNode[];
  highlight?: Tone;
}
export interface NetWorthTab {
  title: string;
  content: UiNode[];
}
export interface NetWorthMetric {
  label: string;
  value: PriceNode | TextNode;
}

export interface SlotIO {
  'priceCheck.section': { input: PriceCheckInput; output: SectionNode | null };
  'priceCheck.badge': { input: PriceCheckInput; output: BadgeNode | null };
  'market.column': { input: MarketInput; output: MarketColumn | null };
  'market.filter': { input: MarketInput; output: MarketFilter | null };
  'market.sort': { input: MarketInput; output: MarketSort | null };
  /** Buttons run their command with `args` defaulting to the row id. */
  'market.rowAction': { input: MarketRowInput; output: ButtonNode[] };
  'chat.decorate': { input: ChatMessage; output: ChatDecoration | null };
  'chat.action': { input: ChatMessage; output: ButtonNode[] };
  'networth.tab': { input: NetWorthSummary; output: NetWorthTab | null };
  'networth.metric': { input: NetWorthSummary; output: NetWorthMetric | null };
  'ticker.widget': { input: TickerInput; output: InlineNode[] | null };
}

export type CallableSlotId = keyof SlotIO;
export type SlotInput<S extends CallableSlotId> = SlotIO[S]['input'];
export type SlotOutput<S extends CallableSlotId> = SlotIO[S]['output'];

/** Every slot a manifest may declare. `settings.section` is host-rendered from `manifest.settings` (no worker call). */
export const SLOT_IDS = [
  'priceCheck.section',
  'priceCheck.badge',
  'market.column',
  'market.filter',
  'market.sort',
  'market.rowAction',
  'chat.decorate',
  'chat.action',
  'networth.tab',
  'networth.metric',
  'ticker.widget',
  'settings.section',
] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Permission the host requires before it passes a slot its input (none for ticker.widget). */
export const SLOT_PERMISSIONS: Record<CallableSlotId, Permission | null> = {
  'priceCheck.section': 'items:read',
  'priceCheck.badge': 'items:read',
  'market.column': 'prices:read',
  'market.filter': 'prices:read',
  'market.sort': 'prices:read',
  'market.rowAction': 'prices:read',
  'chat.decorate': 'chat:read',
  'chat.action': 'chat:read',
  'networth.tab': 'stash:read',
  'networth.metric': 'stash:read',
  'ticker.widget': null,
};

const shortText = z.string().min(1).max(40);
const rowIds = z.array(z.string().max(64)).max(500);

export const SLOT_OUTPUT_SCHEMAS = {
  'priceCheck.section': z.union([
    z.null(),
    z
      .object({ type: z.literal('section'), title: z.string().min(1).max(80), children: z.array(uiNodeSchema).max(50) })
      .strict(),
  ]),
  'priceCheck.badge': badgeNodeSchema.nullable(),
  'market.column': z
    .object({
      title: shortText,
      cells: z.record(z.object({ text: z.string().max(40), tone: z.enum(TONES).optional() }).strict()),
    })
    .strict()
    .refine((c) => Object.keys(c.cells).length <= 500, 'too many cells')
    .nullable(),
  'market.filter': z.object({ label: shortText, keep: rowIds }).strict().nullable(),
  'market.sort': z
    .object({ label: shortText, scores: z.record(z.number().finite()) })
    .strict()
    .refine((s) => Object.keys(s.scores).length <= 500, 'too many scores')
    .nullable(),
  'market.rowAction': z.array(buttonNodeSchema).max(3),
  'chat.decorate': z
    .object({ tags: z.array(badgeNodeSchema).max(3), highlight: z.enum(TONES).optional() })
    .strict()
    .nullable(),
  'chat.action': z.array(buttonNodeSchema).max(3),
  'networth.tab': z
    .object({ title: shortText, content: z.array(uiNodeSchema).max(50) })
    .strict()
    .nullable(),
  'networth.metric': z
    .object({ label: shortText, value: z.discriminatedUnion('type', [priceNodeSchema, textNodeSchema]) })
    .strict()
    .nullable(),
  'ticker.widget': z.array(inlineNodeSchema).max(4).nullable(),
} as unknown as { [S in CallableSlotId]: z.ZodType<SlotOutput<S>> };

// ---------------------------------------------------------------------------------------------------------------
// Events (B9)
// ---------------------------------------------------------------------------------------------------------------

export interface ThemeInfo {
  id: string;
  mode: 'dark' | 'light';
  /** Every THEME_TOKENS value, keyed without the leading `--`, plus window-opacity. */
  vars: Record<string, string>;
}

export interface EventMap {
  'item.priceChecked': PriceCheckInput;
  'chat.message': ChatMessage;
  'game.focus': { focused: boolean };
  'theme.changed': ThemeInfo;
}
export type EventName = keyof EventMap;

export const EVENT_NAMES = ['item.priceChecked', 'chat.message', 'game.focus', 'theme.changed'] as const;

export const EVENT_PERMISSIONS: Record<EventName, Permission | null> = {
  'item.priceChecked': 'items:read',
  'chat.message': 'chat:read',
  'game.focus': null,
  'theme.changed': null,
};
