import { describe, expect, it } from 'vitest';
import type { PluginSettingsSchema } from '@pd2-trader/plugin-sdk';
import { coerceFieldValue, fieldDisplayValue, schemaFields, type SchemaField } from './schema-form';

const SCHEMA: PluginSettingsSchema = {
  type: 'object',
  properties: {
    compact: { type: 'boolean', title: 'Compact', default: false },
    currency: { type: 'string', title: 'Currency', enum: ['hr', 'ist'], default: 'hr' },
    label: { type: 'string', title: 'Label', maxLength: 5, description: 'Shown on the badge' },
    count: { type: 'integer', title: 'Count', minimum: 1, maximum: 10 },
    ratio: { type: 'number', title: 'Ratio' },
    tier: { type: 'integer', title: 'Tier', enum: [1, 2, 3] },
  },
};

const fields = schemaFields(SCHEMA);
const field = (key: string) => fields.find((f) => f.key === key) as SchemaField;

describe('schemaFields', () => {
  it('maps each property type to a control in schema order', () => {
    expect(fields.map((f) => [f.key, f.kind])).toEqual([
      ['compact', 'switch'],
      ['currency', 'select'],
      ['label', 'text'],
      ['count', 'number'],
      ['ratio', 'number'],
      ['tier', 'select'],
    ]);
  });

  it('carries limits and labels', () => {
    expect(field('label')).toMatchObject({ maxLength: 5, title: 'Label', description: 'Shown on the badge' });
    expect(field('count')).toMatchObject({ min: 1, max: 10, step: 1 });
    expect(field('ratio')).toMatchObject({ step: 'any' });
    expect(field('tier')).toMatchObject({ options: ['1', '2', '3'] });
  });

  it('is empty without a schema', () => {
    expect(schemaFields(undefined)).toEqual([]);
  });
});

describe('coerceFieldValue', () => {
  it('keeps booleans for switches', () => {
    expect(coerceFieldValue(field('compact'), true)).toBe(true);
    expect(coerceFieldValue(field('compact'), 'true')).toBeUndefined();
  });

  it('maps select strings back to the enum value type', () => {
    expect(coerceFieldValue(field('currency'), 'ist')).toBe('ist');
    expect(coerceFieldValue(field('currency'), 'gold')).toBeUndefined();
    expect(coerceFieldValue(field('tier'), '2')).toBe(2);
    expect(coerceFieldValue(field('tier'), '4')).toBeUndefined();
  });

  it('enforces maxLength on strings', () => {
    expect(coerceFieldValue(field('label'), 'abcde')).toBe('abcde');
    expect(coerceFieldValue(field('label'), 'abcdef')).toBeUndefined();
  });

  it('parses numbers within bounds and rejects fractions for integers', () => {
    expect(coerceFieldValue(field('count'), '7')).toBe(7);
    expect(coerceFieldValue(field('count'), '0')).toBeUndefined();
    expect(coerceFieldValue(field('count'), '11')).toBeUndefined();
    expect(coerceFieldValue(field('count'), '2.5')).toBeUndefined();
    expect(coerceFieldValue(field('count'), '')).toBeUndefined();
    expect(coerceFieldValue(field('ratio'), '0.25')).toBe(0.25);
    expect(coerceFieldValue(field('ratio'), 'abc')).toBeUndefined();
  });
});

describe('fieldDisplayValue', () => {
  it('shows switches as booleans and the rest as strings', () => {
    expect(fieldDisplayValue(field('compact'), true)).toBe(true);
    expect(fieldDisplayValue(field('compact'), undefined)).toBe(false);
    expect(fieldDisplayValue(field('tier'), 2)).toBe('2');
    expect(fieldDisplayValue(field('label'), undefined)).toBe('');
  });
});
