import { z } from 'zod';
import { THEME_TOKENS, type ThemeToken } from '@pd2-trader/ui/tokens';
import { PERMISSIONS } from './permissions';
import { isValidRange, isValidVersion } from './semver';
import { SLOT_IDS } from './slots';

/**
 * Plugin manifest (PRD §6.3). The one schema for the overlay host and the marketplace server (which loads it from
 * the CommonJS build of `@pd2-trader/plugin-sdk/manifest`). Unknown keys are rejected so typos fail loudly.
 */

export const PLUGIN_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;
export const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
export const COMMAND_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
export const PANEL_ID_RE = /^[a-z][a-zA-Z0-9-]{0,31}$/;

/** Marketplace taxonomy (fixed; the server serves the labels): `ui` = "UI & themes", `utility` = "Utilities". */
export const CATEGORIES = ['pricing', 'trading', 'chat', 'stash', 'builds', 'ui', 'utility'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Relative bundle path: no scheme, no leading slash, no `..`. */
const bundlePath = z
  .string()
  .min(1)
  .max(128)
  .refine((p) => !/^[a-z][a-z0-9+.-]*:/i.test(p) && !p.startsWith('/') && !p.split(/[\\/]/).includes('..'), {
    message: 'must be a relative path inside the bundle',
  });

const settingProperty = z
  .object({
    type: z.enum(['string', 'number', 'integer', 'boolean']),
    title: z.string().min(1).max(60),
    description: z.string().max(200).optional(),
    default: z.union([z.string().max(500), z.number().finite(), z.boolean()]).optional(),
    enum: z
      .array(z.union([z.string().max(60), z.number().finite()]))
      .min(1)
      .max(30)
      .optional(),
    minimum: z.number().finite().optional(),
    maximum: z.number().finite().optional(),
    maxLength: z.number().int().positive().max(500).optional(),
  })
  .strict()
  .refine((p) => p.default === undefined || typeof p.default === (p.type === 'integer' ? 'number' : p.type), {
    message: 'default does not match type',
  });
export type SettingProperty = z.infer<typeof settingProperty>;

export const settingsSchemaSchema = z
  .object({
    $schema: z.string().optional(),
    type: z.literal('object'),
    properties: z
      .record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/), settingProperty)
      .refine((p) => Object.keys(p).length <= 30, 'at most 30 settings'),
  })
  .strict();
export type PluginSettingsSchema = z.infer<typeof settingsSchemaSchema>;

/**
 * Theme value: oklch()/oklab()/hex colors (alpha allowed) or a rem/px length for `radius`. No var(), url(),
 * semicolons or braces: values are written into CSS custom properties.
 */
const COLOR_RE =
  /^(?:oklch|oklab)\(\s*[\d.]+%?\s+-?[\d.]+%?\s+-?[\d.]+(?:deg)?\s*(?:\/\s*[\d.]+%?\s*)?\)$|^#[0-9a-fA-F]{3,8}$/;
const LENGTH_RE = /^\d+(?:\.\d+)?(?:rem|px)$/;

/** Derived by the host from background/popover so the window-transparency setting keeps working. */
export const DERIVED_THEME_TOKENS = ['surface', 'surface-elevated'] as const satisfies readonly ThemeToken[];
export const PLUGIN_THEME_TOKENS = THEME_TOKENS.filter(
  (t) => !(DERIVED_THEME_TOKENS as readonly string[]).includes(t),
) as Exclude<ThemeToken, (typeof DERIVED_THEME_TOKENS)[number]>[];

export const themeSchema = z
  .object({
    mode: z.enum(['dark', 'light']),
    description: z.string().max(120).optional(),
    vars: z.record(z.string(), z.string().max(80)),
  })
  .strict()
  .superRefine((theme, ctx) => {
    for (const token of PLUGIN_THEME_TOKENS) {
      const value = theme.vars[token];
      if (value === undefined)
        ctx.addIssue({ code: 'custom', path: ['vars', token], message: `missing token ${token}` });
      else if (!(token === 'radius' ? LENGTH_RE : COLOR_RE).test(value.trim()))
        ctx.addIssue({ code: 'custom', path: ['vars', token], message: `invalid value for ${token}` });
    }
    for (const key of Object.keys(theme.vars)) {
      if (!(PLUGIN_THEME_TOKENS as string[]).includes(key))
        ctx.addIssue({ code: 'custom', path: ['vars', key], message: `unknown token ${key}` });
    }
  });
export type PluginTheme = z.infer<typeof themeSchema>;

export const manifestSchema = z
  .object({
    id: z.string().max(100).regex(PLUGIN_ID_RE, 'reverse-DNS id, e.g. com.example.craft-value'),
    name: z.string().min(1).max(48),
    version: z.string().refine(isValidVersion, 'semver x.y.z'),
    sdk: z.string().refine(isValidRange, 'semver range, e.g. ^1.0.0'),
    description: z.string().max(200).optional(),
    author: z.string().max(60).optional(),
    category: z.enum(CATEGORIES).optional(),
    entry: z
      .object({
        worker: bundlePath.optional(),
        panels: z
          .record(z.string().regex(PANEL_ID_RE), bundlePath)
          .refine((p) => Object.keys(p).length <= 4, 'at most 4 panels')
          .optional(),
      })
      .strict()
      .default({}),
    slots: z.array(z.enum(SLOT_IDS)).max(SLOT_IDS.length).default([]),
    commands: z
      .array(
        z
          .object({
            id: z.string().regex(COMMAND_ID_RE),
            title: z.string().min(1).max(48),
            defaultHotkey: z.string().max(32).nullable().default(null),
          })
          .strict(),
      )
      .max(10)
      .default([]),
    permissions: z.array(z.enum(PERMISSIONS)).default([]),
    network: z.array(z.string().regex(HOSTNAME_RE, 'hostname without scheme, port or wildcard')).max(10).default([]),
    settings: settingsSchemaSchema.optional(),
    theme: themeSchema.optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    const unique = (values: string[], path: string) => {
      if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', path: [path], message: 'duplicates' });
    };
    unique(m.slots, 'slots');
    unique(m.permissions, 'permissions');
    unique(m.network, 'network');
    unique(
      m.commands.map((c) => c.id),
      'commands',
    );
    if (!m.entry.worker && !m.theme && !m.entry.panels)
      ctx.addIssue({ code: 'custom', path: ['entry'], message: 'needs entry.worker, entry.panels or theme' });
    if (m.slots.some((s) => s !== 'settings.section') && !m.entry.worker)
      ctx.addIssue({ code: 'custom', path: ['entry', 'worker'], message: 'slots need a worker' });
    if (m.slots.includes('settings.section') && !m.settings)
      ctx.addIssue({ code: 'custom', path: ['settings'], message: 'settings.section needs a settings schema' });
  });

export type PluginManifest = z.output<typeof manifestSchema>;
export type PluginManifestInput = z.input<typeof manifestSchema>;

/** `manifest` when valid; otherwise `errors` (one line per issue). */
export interface ManifestResult {
  manifest?: PluginManifest;
  errors: string[];
}

export function parseManifest(value: unknown): ManifestResult {
  const parsed = manifestSchema.safeParse(value);
  if (parsed.success) return { manifest: parsed.data as PluginManifest, errors: [] };
  return { errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'manifest'}: ${i.message}`) };
}

/** Settings values merged over schema defaults, coerced to the schema (unknown keys dropped). */
export function resolveSettings(
  schema: PluginSettingsSchema | undefined,
  values: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!schema) return out;
  for (const [key, prop] of Object.entries(schema.properties)) {
    const value = values?.[key];
    const ok =
      prop.type === 'boolean'
        ? typeof value === 'boolean'
        : prop.type === 'string'
          ? typeof value === 'string' && value.length <= (prop.maxLength ?? 500)
          : typeof value === 'number' &&
            Number.isFinite(value) &&
            (prop.type === 'number' || Number.isInteger(value)) &&
            (prop.minimum === undefined || value >= prop.minimum) &&
            (prop.maximum === undefined || value <= prop.maximum);
    const allowed = ok && (!prop.enum || prop.enum.includes(value as string | number));
    if (allowed) out[key] = value as string | number | boolean;
    else if (prop.default !== undefined) out[key] = prop.default;
  }
  return out;
}
