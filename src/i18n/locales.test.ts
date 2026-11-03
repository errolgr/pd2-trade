import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages';
import { NAMESPACES } from './resources';

/**
 * Invariants of the locale files (src/i18n/locales/<language>/<namespace>.json): every language has exactly the
 * English keys, the plural forms its language needs, and the same {{placeholders}} / <tags> as English; and every
 * literal key the source passes to t() / <Trans i18nKey> exists in English.
 */

const LOCALES_DIR = join(__dirname, 'locales');
const SRC_DIR = join(__dirname, '..');
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

type Flat = Record<string, string>;

function flatten(value: unknown, prefix = '', out: Flat = {}): Flat {
  if (typeof value === 'string') {
    out[prefix] = value;
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out[prefix] = `<<invalid ${JSON.stringify(value)}>>`;
  }
  return out;
}

function load(language: string, namespace: string): Flat {
  return flatten(JSON.parse(readFileSync(join(LOCALES_DIR, language, `${namespace}.json`), 'utf8')));
}

/** Key → plural forms present ('' for a plain key). */
function groupPlurals(flat: Flat): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const key of Object.keys(flat)) {
    const match = key.match(PLURAL_SUFFIX);
    const base = match ? key.slice(0, -match[0].length) : key;
    if (!groups.has(base)) groups.set(base, new Set());
    groups.get(base)!.add(match ? match[1] : '');
  }
  return groups;
}

/** The sorted {{placeholders}} (format specifiers dropped) and <tags> of a string. */
function tokens(text: string): string[] {
  const placeholders = [...text.matchAll(/\{\{\s*([^,}\s]+)[^}]*\}\}/g)].map((m) => `{{${m[1]}}}`);
  const tags = [...text.matchAll(/<\/?([A-Za-z0-9_]+)\s*\/?>/g)].map((m) => `<${m[1]}>`);
  return [...placeholders, ...tags].sort();
}

const en = Object.fromEntries(NAMESPACES.map((ns) => [ns, load(DEFAULT_LANGUAGE, ns)]));

describe('locale files', () => {
  it('registers exactly the English namespace files', () => {
    const files = readdirSync(join(LOCALES_DIR, DEFAULT_LANGUAGE))
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''));
    expect([...NAMESPACES].sort()).toEqual(files.sort());
  });

  it('has one folder per supported language', () => {
    expect(readdirSync(LOCALES_DIR).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('English plurals have the one and other forms', () => {
    for (const ns of NAMESPACES) {
      for (const [base, forms] of groupPlurals(en[ns])) {
        if (forms.has('')) expect(forms.size, `${ns}:${base} is both plain and plural`).toBe(1);
        else expect([...forms].sort(), `${ns}:${base}`).toEqual(['one', 'other']);
      }
    }
  });

  describe.each(SUPPORTED_LANGUAGES.filter((lng) => lng !== DEFAULT_LANGUAGE))('%s', (language) => {
    const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories.slice().sort();

    it.each(NAMESPACES)('%s has exactly the English keys, plural forms and placeholders', (ns) => {
      const source = en[ns];
      const target = load(language, ns);
      const sourceGroups = groupPlurals(source);
      const targetGroups = groupPlurals(target);

      expect([...targetGroups.keys()].sort(), 'keys').toEqual([...sourceGroups.keys()].sort());

      for (const [base, forms] of sourceGroups) {
        const plural = !forms.has('');
        const targetForms = [...(targetGroups.get(base) ?? [])].sort();
        expect(targetForms, `${ns}:${base} forms`).toEqual(plural ? categories : ['']);

        const expected = tokens(source[plural ? `${base}_other` : base]);
        for (const form of targetForms) {
          const key = form ? `${base}_${form}` : base;
          expect(target[key].trim(), `${ns}:${key} is empty`).not.toBe('');
          expect(tokens(target[key]), `${ns}:${key} placeholders`).toEqual(expected);
        }
      }
    });
  });
});

/** Every non-test source file outside src/i18n. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === __dirname ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Literal i18n keys: t('…'), i18nKey="…", and option-list properties like labelKey: '…'. */
const KEY_PATTERNS = [
  /\bt\(\s*(['"])([^'"`$]+)\1/g,
  /\bi18nKey=\{?\s*(['"])([^'"`$]+)\1/g,
  /\b(?:label|title|description|tooltip|placeholder|text|message|hint|name|aria)Key\??\s*:\s*(['"])([^'"`$]+)\1/g,
];

describe('keys used in the source', () => {
  const enKeys = Object.fromEntries(
    NAMESPACES.map((ns) => [ns, new Set(Object.keys(en[ns]).map((key) => key.replace(PLURAL_SUFFIX, '')))]),
  );
  const known = new Set<string>(NAMESPACES);

  it('exist in the English locale files', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(SRC_DIR)) {
      const text = readFileSync(file, 'utf8');
      // The file's namespaces: useTranslation('ns') / useTranslation(['ns', …]); unprefixed keys resolve against them
      const fileNamespaces = new Set<string>();
      for (const match of text.matchAll(/useTranslation\(\s*(?:\[([^\]]*)\]|(['"])(\w+)\2)?/g)) {
        const names = match[1] ? [...match[1].matchAll(/['"](\w+)['"]/g)].map((m) => m[1]) : [match[3] ?? 'common'];
        names.forEach((name) => fileNamespaces.add(name));
      }
      if (fileNamespaces.size === 0) fileNamespaces.add('common');

      for (const pattern of KEY_PATTERNS) {
        for (const match of text.matchAll(pattern)) {
          const key = match[2];
          const separator = key.indexOf(':');
          const prefixed = separator > 0 && known.has(key.slice(0, separator));
          const found = prefixed
            ? enKeys[key.slice(0, separator)].has(key.slice(separator + 1))
            : [...fileNamespaces].some((ns) => enKeys[ns]?.has(key));
          if (!found) missing.push(`${relative(SRC_DIR, file)}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
