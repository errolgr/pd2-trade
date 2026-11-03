/**
 * Declarative slot UI (PRD §6.2). A plugin worker returns a JSON tree; the host validates it against the
 * schemas in ui-schema.ts and renders it with design-system slot components. Plugins never put DOM into core
 * panels. This module stays zod-free so workers that use the `ui` builders bundle small.
 */

export const TONES = [
  'default',
  'muted',
  'success',
  'warning',
  'danger',
  'q-unique',
  'q-set',
  'q-rare',
  'q-magic',
  'q-crafted',
  'q-rune',
] as const;
export type Tone = (typeof TONES)[number];

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface SectionNode {
  type: 'section';
  title: string;
  children: UiNode[];
}
export interface RowNode {
  type: 'row';
  label: string;
  value: string;
  tone?: Tone;
}
export interface BadgeNode {
  type: 'badge';
  text: string;
  tone: Tone;
}
export interface TextNode {
  type: 'text';
  text: string;
  tone?: Tone;
  size?: 'sm' | 'md';
}
export interface PriceNode {
  type: 'price';
  amount: number;
  unit: 'hr' | 'rune' | 'gold';
  trend?: 'up' | 'down' | 'flat';
}
export interface ButtonNode {
  type: 'button';
  label: string;
  /** A command from manifest.commands; the host runs it with `args`. */
  commandId: string;
  args?: JsonValue;
}
export interface DividerNode {
  type: 'divider';
}
export interface ListNode {
  type: 'list';
  items: UiNode[];
}

export type UiNode = SectionNode | RowNode | BadgeNode | TextNode | PriceNode | ButtonNode | DividerNode | ListNode;
export type InlineNode = BadgeNode | TextNode | PriceNode;

/** Tree limits: keep slot payloads small enough to validate and render in a frame. */
export const UI_LIMITS = { maxDepth: 6, maxNodes: 200, maxText: 300, maxArgsBytes: 2048 } as const;

/** Depth and node count over any slot output (nested `children` / `items` / `content` arrays). */
export function measureTree(value: unknown, depth = 0): { depth: number; nodes: number } {
  if (Array.isArray(value)) {
    return value.reduce<{ depth: number; nodes: number }>(
      (acc, child) => {
        const m = measureTree(child, depth);
        return { depth: Math.max(acc.depth, m.depth), nodes: acc.nodes + m.nodes };
      },
      { depth, nodes: 0 },
    );
  }
  if (!value || typeof value !== 'object') return { depth, nodes: 0 };
  const node = value as Record<string, unknown>;
  const isNode = typeof node.type === 'string';
  let result = { depth: isNode ? depth + 1 : depth, nodes: isNode ? 1 : 0 };
  for (const key of ['children', 'items', 'content', 'tags', 'value']) {
    if (node[key] && typeof node[key] === 'object') {
      const m = measureTree(node[key], result.depth);
      result = { depth: Math.max(result.depth, m.depth), nodes: result.nodes + m.nodes };
    }
  }
  return result;
}

/** Builders: `ui.section('Craft value', [ui.row('Base', '2 HR')])`. Output is plain JSON. */
export const ui = {
  section: (title: string, children: UiNode[]): SectionNode => ({ type: 'section', title, children }),
  row: (label: string, value: string, tone?: Tone): RowNode => ({ type: 'row', label, value, ...(tone && { tone }) }),
  badge: (text: string, tone: Tone = 'default'): BadgeNode => ({ type: 'badge', text, tone }),
  text: (text: string, opts: { tone?: Tone; size?: 'sm' | 'md' } = {}): TextNode => ({ type: 'text', text, ...opts }),
  price: (amount: number, unit: PriceNode['unit'] = 'hr', trend?: PriceNode['trend']): PriceNode => ({
    type: 'price',
    amount,
    unit,
    ...(trend && { trend }),
  }),
  button: (label: string, commandId: string, args?: JsonValue): ButtonNode => ({
    type: 'button',
    label,
    commandId,
    ...(args !== undefined && { args }),
  }),
  divider: (): DividerNode => ({ type: 'divider' }),
  list: (items: UiNode[]): ListNode => ({ type: 'list', items }),
};
