import type { PluginSettingsSchema, SettingProperty } from '@pd2-trader/plugin-sdk';

/**
 * B5: a plugin's settings JSON-schema subset (manifest.settings) as form fields, and form input coerced back to
 * schema values. Titles and descriptions are plugin content, rendered as plain text.
 */

export type SettingValue = string | number | boolean;

interface FieldBase {
  key: string;
  title: string;
  description?: string;
  prop: SettingProperty;
}

export type SchemaField =
  | (FieldBase & { kind: 'switch' })
  /** Select values are strings; `coerceFieldValue` maps them back to the enum's (string or number) value. */
  | (FieldBase & { kind: 'select'; options: string[] })
  | (FieldBase & { kind: 'text'; maxLength: number })
  | (FieldBase & { kind: 'number'; min?: number; max?: number; step: number | 'any' });

const MAX_STRING = 500;

export function schemaFields(schema: PluginSettingsSchema | undefined): SchemaField[] {
  if (!schema) return [];
  return Object.entries(schema.properties).map(([key, prop]): SchemaField => {
    const base = { key, title: prop.title, description: prop.description, prop };
    if (prop.type === 'boolean') return { ...base, kind: 'switch' };
    if (prop.enum) return { ...base, kind: 'select', options: prop.enum.map(String) };
    if (prop.type === 'string') return { ...base, kind: 'text', maxLength: prop.maxLength ?? MAX_STRING };
    return {
      ...base,
      kind: 'number',
      min: prop.minimum,
      max: prop.maximum,
      step: prop.type === 'integer' ? 1 : 'any',
    };
  });
}

/** A stored value as the control shows it (Switch: boolean, everything else: string). */
export function fieldDisplayValue(field: SchemaField, value: SettingValue | undefined): string | boolean {
  if (field.kind === 'switch') return value === true;
  return value === undefined ? '' : String(value);
}

/** Control input → schema value; undefined when it does not satisfy the schema (not saved). */
export function coerceFieldValue(field: SchemaField, raw: string | boolean): SettingValue | undefined {
  const { prop } = field;
  if (field.kind === 'switch') return typeof raw === 'boolean' ? raw : undefined;
  if (typeof raw !== 'string') return undefined;
  let value: SettingValue;
  if (prop.type === 'string') {
    if (raw.length > (prop.maxLength ?? MAX_STRING)) return undefined;
    value = raw;
  } else {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    if (prop.type === 'integer' && !Number.isInteger(n)) return undefined;
    if (prop.minimum !== undefined && n < prop.minimum) return undefined;
    if (prop.maximum !== undefined && n > prop.maximum) return undefined;
    value = n;
  }
  if (prop.enum && !prop.enum.includes(value as string | number)) return undefined;
  return value;
}
