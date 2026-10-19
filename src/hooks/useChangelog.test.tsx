// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVersion } from '@/lib/browser-app';
import { useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { useChangelog } from './useChangelog';

vi.mock('@/lib/browser-app', () => ({ getVersion: vi.fn() }));
vi.mock('@/overlay', () => ({ useOverlay: vi.fn() }));

const openPanel = vi.fn();
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/assets/changeLog', () => ({ changeLog: { '1.2.0': ['New thing'] } }));

let options: { settings: { lastSeenVersion?: string }; isLoading: boolean };

async function renderChangelog(lastSeenVersion: string | undefined, version: string, isLoading = false) {
  options = { settings: { lastSeenVersion }, isLoading };
  vi.mocked(getVersion).mockResolvedValue(version);
  const view = renderHook(() => useChangelog());
  await act(async () => {});
  return view;
}

beforeEach(() => {
  vi.mocked(useOptions).mockImplementation(() => options as never);
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useChangelog', () => {
  it('opens the changelog after an upgrade to a version with notes', async () => {
    await renderChangelog('1.1.0', '1.2.0');
    expect(openPanel).toHaveBeenCalledTimes(1);
    expect(openPanel).toHaveBeenCalledWith('changeLog');
  });

  it('stays closed when the user already saw this version', async () => {
    await renderChangelog('1.2.0', '1.2.0');
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('stays closed for a version without changelog notes', async () => {
    await renderChangelog('1.1.0', '1.2.1');
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('stays closed when the version is unknown', async () => {
    await renderChangelog('1.1.0', '');
    expect(openPanel).not.toHaveBeenCalled();
  });

  it('waits for settings to load before comparing versions', async () => {
    const { rerender } = await renderChangelog('0.0.0', '1.2.0', true);
    expect(getVersion).not.toHaveBeenCalled();

    // Loaded settings show the user already saw 1.2.0: the default '0.0.0' must not trigger the popup
    options = { settings: { lastSeenVersion: '1.2.0' }, isLoading: false };
    rerender();
    await act(async () => {});
    expect(openPanel).not.toHaveBeenCalled();
  });
});
