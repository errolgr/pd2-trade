import { z } from 'zod';
import { TONES, UI_LIMITS, type InlineNode, type JsonValue, type UiNode } from './ui';

/**
 * Zod schemas for the declarative slot UI (see ui.ts). Kept apart from the builders so plugin workers that
 * only use `ui.*` don't bundle zod; the host validates slot output with these.
 */

const text = z.string().max(UI_LIMITS.maxText);
const label = z.string().min(1).max(80);
const tone = z.enum(TONES);
const commandId = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonValueSchema), z.record(jsonValueSchema)]),
);

const argsSchema = jsonValueSchema.refine((value) => JSON.stringify(value).length <= UI_LIMITS.maxArgsBytes, {
  message: `args larger than ${UI_LIMITS.maxArgsBytes} bytes`,
});

export const badgeNodeSchema = z.object({ type: z.literal('badge'), text: z.string().min(1).max(40), tone }).strict();
export const textNodeSchema = z
  .object({ type: z.literal('text'), text, tone: tone.optional(), size: z.enum(['sm', 'md']).optional() })
  .strict();
export const priceNodeSchema = z
  .object({
    type: z.literal('price'),
    amount: z.number().finite(),
    unit: z.enum(['hr', 'rune', 'gold']),
    trend: z.enum(['up', 'down', 'flat']).optional(),
  })
  .strict();
export const buttonNodeSchema = z
  .object({ type: z.literal('button'), label: z.string().min(1).max(40), commandId, args: argsSchema.optional() })
  .strict();

// Casts: the recursive schema needs an explicit type, and zod's inferred output differs between strict and
// non-strict TS configs (all-optional props without strictNullChecks).
export const uiNodeSchema = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('section'), title: label, children: z.array(uiNodeSchema).max(50) }).strict(),
    z.object({ type: z.literal('row'), label, value: text, tone: tone.optional() }).strict(),
    badgeNodeSchema,
    textNodeSchema,
    priceNodeSchema,
    buttonNodeSchema,
    z.object({ type: z.literal('divider') }).strict(),
    z.object({ type: z.literal('list'), items: z.array(uiNodeSchema).max(50) }).strict(),
  ]),
) as unknown as z.ZodType<UiNode>;

export const inlineNodeSchema = z.discriminatedUnion('type', [
  badgeNodeSchema,
  textNodeSchema,
  priceNodeSchema,
]) as unknown as z.ZodType<InlineNode>;
