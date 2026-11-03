// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseManifest } from '@pd2-trader/plugin-sdk';
import { usePluginHost } from '@/plugins/ui/hooks';
import { pluginHost, type PluginHostSnapshot, type PluginView } from '@/plugins/host/manager';
import { devLoader } from '@/plugins/dev/unpacked';
import type { InstalledPlugin, PluginBundle } from '@/plugins/host/types';
import { PluginsForm } from './plugins-form';

vi.mock('@/plugins/ui/hooks', () => ({ usePluginHost: vi.fn() }));
vi.mock('@/overlay', () => ({
  useOverlay: () => ({ openPanel: vi.fn() }),
  showToast: vi.fn(),
  confirmToast: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false }));
// vi.mock factories are hoisted above static imports, so the shim must be loaded inside the factory.
vi.mock('@pd2-trader/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...(await import('../test-utils')).selectShim,
}));
// happy-dom rejects cancelled WAAPI animations (Banner / EmptyState): render motion.* as plain elements
vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));

const { manifest } = parseManifest({
  id: 'com.example.tool',
  name: 'Tool',
  version: '1.0.0',
  sdk: '^1.0.0',
  slots: ['settings.section'],
  entry: { worker: 'worker.js' },
  settings: {
    type: 'object',
    properties: {
      compact: { type: 'boolean', title: 'Compact rows', default: false },
      count: { type: 'integer', title: 'Rows', minimum: 1, maximum: 10, default: 3 },
      currency: { type: 'string', title: 'Currency', enum: ['hr', 'ist'], default: 'hr' },
    },
  },
});

const installed: InstalledPlugin = {
  id: 'com.example.tool',
  version: '1.0.0',
  name: 'Tool',
  source: { kind: 'dev', location: 'http://localhost:5199/', transport: 'url' },
  enabled: true,
  granted: { permissions: [], network: [] },
  settings: {},
  hotkeys: {},
  installedAt: '2026-11-01T00:00:00.000Z',
};

const host = (plugins: PluginView[]): PluginHostSnapshot => ({
  ready: true,
  plugins,
  consent: null,
  panels: [],
  themes: [],
});
const view: PluginView = { installed, manifest: manifest!, status: 'running', failures: 0 };

let stored: Record<string, string | number | boolean>;

beforeEach(() => {
  stored = { compact: false, count: 3, currency: 'hr' };
  vi.spyOn(pluginHost, 'pluginSettings').mockImplementation(() => stored);
  vi.spyOn(pluginHost, 'setPluginSettings').mockImplementation((_id, values) => {
    stored = values as typeof stored;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PluginsForm', () => {
  it('lists the installed plugin with its source', () => {
    vi.mocked(usePluginHost).mockReturnValue(host([view]));
    render(<PluginsForm />);
    expect(screen.getByText('Unpacked')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Turn Tool on or off' })).toBeTruthy();
  });

  it('renders schema settings and saves coerced values', () => {
    vi.mocked(usePluginHost).mockReturnValue(host([view]));
    render(<PluginsForm />);

    const rows = screen.getByLabelText('Rows') as HTMLInputElement;
    expect(rows.value).toBe('3');
    fireEvent.change(rows, { target: { value: '7' } });
    expect(pluginHost.setPluginSettings).toHaveBeenLastCalledWith(
      'com.example.tool',
      expect.objectContaining({ count: 7 }),
    );

    vi.mocked(pluginHost.setPluginSettings).mockClear();
    fireEvent.change(rows, { target: { value: '11' } });
    expect(pluginHost.setPluginSettings).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a whole number from 1 to 10.')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Compact rows'));
    expect(pluginHost.setPluginSettings).toHaveBeenLastCalledWith(
      'com.example.tool',
      expect.objectContaining({ compact: true }),
    );

    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'ist' } });
    expect(pluginHost.setPluginSettings).toHaveBeenLastCalledWith(
      'com.example.tool',
      expect.objectContaining({ currency: 'ist' }),
    );
  });

  it('loads an unpacked plugin from a dev server URL and installs it', async () => {
    vi.mocked(usePluginHost).mockReturnValue(host([]));
    const bundle = { format: 'pd2-plugin-bundle@1', manifest: manifest!, files: {} } as PluginBundle;
    const load = vi.spyOn(devLoader, 'load').mockResolvedValue(bundle);
    const install = vi.spyOn(pluginHost, 'install').mockResolvedValue(true);
    render(<PluginsForm />);

    fireEvent.change(screen.getByLabelText('Load unpacked'), { target: { value: ' http://localhost:5199/ ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    const source = { kind: 'dev', location: 'http://localhost:5199/', transport: 'url' };
    await waitFor(() => expect(install).toHaveBeenCalledWith(bundle, source));
    expect(load).toHaveBeenCalledWith(source);
  });

  it('shows why an unpacked plugin could not be loaded', async () => {
    vi.mocked(usePluginHost).mockReturnValue(host([]));
    vi.spyOn(devLoader, 'load').mockRejectedValue(new Error('Could not read manifest.json: HTTP 404'));
    const install = vi.spyOn(pluginHost, 'install');
    render(<PluginsForm />);

    fireEvent.change(screen.getByLabelText('Load unpacked'), { target: { value: 'http://localhost:5199/' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect((await screen.findByRole('alert')).textContent).toContain('HTTP 404');
    expect(install).not.toHaveBeenCalled();
  });
});
