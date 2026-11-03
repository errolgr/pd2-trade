import { describe, expect, it } from 'vitest';
import { THEMES } from '@pd2-trader/ui/tokens';
import { parseManifest, PLUGIN_THEME_TOKENS, resolveSettings } from './manifest';
import { satisfies } from './semver';
import { SDK_VERSION } from './version';

const base = {
  id: 'com.example.craft-value',
  name: 'Craft Value',
  version: '1.2.0',
  sdk: '^1.0.0',
  entry: { worker: 'worker.js', panels: { main: 'panels/main.html' } },
  slots: ['priceCheck.section'],
  commands: [{ id: 'open', title: 'Open Craft Value', defaultHotkey: null }],
  permissions: ['prices:read', 'items:read', 'storage:local'],
  network: ['api.example.com'],
};

const themeVars = () => {
  const vars: Record<string, string> = {};
  for (const token of PLUGIN_THEME_TOKENS) vars[token] = token === 'radius' ? '0.5rem' : 'oklch(0.5 0.1 200)';
  return vars;
};

describe('manifest', () => {
  it('accepts the PRD example manifest', () => {
    expect(parseManifest(base).errors).toEqual([]);
  });

  it.each([
    ['id is not reverse-DNS', { id: 'craft-value' }],
    ['id has uppercase', { id: 'com.Example.x' }],
    ['version is not semver', { version: '1.2' }],
    ['sdk is not a range', { sdk: 'latest' }],
    ['never-grantable permission', { permissions: ['clipboard:write'] }],
    ['network:<host> in permissions', { permissions: ['network:api.example.com'] }],
    ['network host with scheme', { network: ['https://api.example.com'] }],
    ['wildcard host', { network: ['*.example.com'] }],
    ['entry path escapes the bundle', { entry: { worker: '../../secrets.js' } }],
    ['entry path is a URL', { entry: { worker: 'https://cdn.example.com/w.js' } }],
    ['unknown slot', { slots: ['window.global'] }],
    ['unknown top-level key', { tauri: { allow: ['*'] } }],
    ['slots without a worker', { entry: {}, theme: undefined }],
  ])('rejects: %s', (_name, patch) => {
    expect(parseManifest({ ...base, ...patch }).manifest).toBeUndefined();
  });

  it('validates theme token sets against THEME_TOKENS (B8)', () => {
    const theme = { mode: 'dark', vars: themeVars() };
    const themeOnly = { id: 'com.example.dusk', name: 'Dusk', version: '1.0.0', sdk: '^1.0.0', theme };
    expect(parseManifest(themeOnly).errors).toEqual([]);
    const missing = { ...theme.vars };
    delete missing.primary;
    expect(parseManifest({ ...themeOnly, theme: { ...theme, vars: missing } }).errors.join()).toMatch(/missing token primary/);
    expect(parseManifest({ ...themeOnly, theme: { ...theme, vars: { ...theme.vars, bogus: '#fff' } } }).manifest).toBeUndefined();
    // CSS injection through a token value
    const injected = { ...theme.vars, background: 'red; } body { background: url(https://evil.example/x)' };
    expect(parseManifest({ ...themeOnly, theme: { ...theme, vars: injected } }).manifest).toBeUndefined();
  });

  it('accepts every built-in theme as a plugin token set', () => {
    for (const t of THEMES.filter((t) => !Object.values(t.vars).some((v) => v.includes('color-mix')))) {
      const vars = Object.fromEntries(PLUGIN_THEME_TOKENS.map((k) => [k, t.vars[k]]));
      const result = parseManifest({ id: 'com.example.t', name: 't', version: '1.0.0', sdk: '^1.0.0', theme: { mode: t.mode, vars } });
      expect(result.errors, t.id).toEqual([]);
    }
  });

  it('resolves settings to the schema, dropping invalid values', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        keywords: { type: 'string' as const, title: 'Keywords', default: '', maxLength: 10 },
        minPrice: { type: 'number' as const, title: 'Min', minimum: 0, default: 1 },
        notify: { type: 'boolean' as const, title: 'Notify', default: true },
      },
    };
    expect(resolveSettings(schema, { keywords: 'shako', minPrice: -5, notify: 'yes', extra: 1 })).toEqual({
      keywords: 'shako',
      minPrice: 1,
      notify: true,
    });
  });
});

describe('semver', () => {
  it.each([
    ['1.0.0', '^1.0.0', true],
    ['1.4.2', '^1.2.0', true],
    ['2.0.0', '^1.0.0', false],
    ['1.1.0', '^1.2.0', false],
    ['0.2.5', '^0.2.0', true],
    ['0.3.0', '^0.2.0', false],
    ['1.2.9', '~1.2.0', true],
    ['1.3.0', '~1.2.0', false],
    ['1.5.0', '>=1.0.0 <2.0.0', true],
    ['1.0.0-beta.1', '^1.0.0', false],
    ['1.9.9', '1.x', true],
    ['3.0.0', '^1.0.0 || ^3.0.0', true],
  ])('%s satisfies %s: %s', (version, range, expected) => {
    expect(satisfies(version, range)).toBe(expected);
  });

  it('the host SDK satisfies the default template range', () => {
    expect(satisfies(SDK_VERSION, '^1.0.0')).toBe(true);
  });
});
