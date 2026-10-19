// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useOptions } from '@/hooks/useOptions';
import ChangelogPage from './ChangeLogPage';

vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn() }));
vi.mock('@tauri-apps/api/webviewWindow', () => ({ getCurrentWebviewWindow: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/assets/changeLog', () => ({
  changeLog: {
    '2.0.0': ['🆕 Brand new thing', '🔧 Fixed a crash', 'Plain note'],
    '1.9.0': ['✨ Shinier'],
    '1.8.0': ['🐛 Squashed', '📊 Charts'],
  },
}));

const updateSettings = vi.fn();
const hide = vi.fn();

async function renderPage(running: string, lastSeenVersion?: string) {
  vi.mocked(getVersion).mockResolvedValue(running);
  vi.mocked(useOptions).mockReturnValue({ settings: { lastSeenVersion }, updateSettings } as never);
  const view = render(<ChangelogPage />);
  await act(async () => {});
  return view;
}

const section = (version: string) => screen.getByText(`v${version}`).closest('section') as HTMLElement;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  updateSettings.mockReset();
  hide.mockReset();
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({ hide } as never);
});

afterEach(cleanup);

describe('ChangelogPage', () => {
  it('shows a skeleton until the running version is known', () => {
    vi.mocked(getVersion).mockReturnValue(new Promise(() => {}));
    vi.mocked(useOptions).mockReturnValue({ settings: {}, updateSettings } as never);
    render(<ChangelogPage />);
    expect(screen.queryByText('v2.0.0')).toBeNull();
  });

  it('lists every version newest first and marks only the running one as current', async () => {
    await renderPage('1.9.0', '1.9.0');
    expect(screen.getAllByText(/^v\d/).map((el) => el.textContent)).toEqual(['v2.0.0', 'v1.9.0', 'v1.8.0']);
    expect(within(section('1.9.0')).queryByText('Current')).not.toBeNull();
    expect(screen.getAllByText('Current')).toHaveLength(1);
  });

  it('records the running version as seen when it changed', async () => {
    await renderPage('2.0.0', '1.9.0');
    expect(updateSettings).toHaveBeenCalledWith({ lastSeenVersion: '2.0.0' });
  });

  it('does not rewrite settings when the version was already seen', async () => {
    await renderPage('2.0.0', '2.0.0');
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('splits the leading emoji from the text and colours features and fixes', async () => {
    await renderPage('2.0.0', '2.0.0');
    const items = within(section('2.0.0')).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['🆕Brand new thing', '🔧Fixed a crash', 'Plain note']);
    expect(items[0].className).toContain('border-success');
    expect(items[1].className).toContain('border-warning');
    expect(items[2].className).toContain('border-border');
    // Other recognised emoji are kept but not coloured as feature/fix
    const older = within(section('1.8.0')).getAllByRole('listitem');
    expect(older[0].className).toContain('border-border');
  });

  it('pluralises the change count', async () => {
    await renderPage('2.0.0', '2.0.0');
    expect(within(section('2.0.0')).queryByText('3 changes')).not.toBeNull();
    expect(within(section('1.9.0')).queryByText('1 change')).not.toBeNull();
  });

  it('hides the window on close', async () => {
    await renderPage('2.0.0', '2.0.0');
    fireEvent.click(screen.getByRole('button', { name: 'Close changelog' }));
    expect(hide).toHaveBeenCalledTimes(1);
  });
});
