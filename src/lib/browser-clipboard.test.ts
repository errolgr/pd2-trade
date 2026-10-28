import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readText as tauriReadText, writeText as tauriWriteText } from '@tauri-apps/plugin-clipboard-manager';
import { readText, writeText } from './browser-clipboard';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ readText: vi.fn(), writeText: vi.fn() }));

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Tauri mode', () => {
  beforeEach(() => {
    tauri.value = true;
    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn(), writeText: vi.fn() } });
  });

  it('reads through the clipboard plugin, not the web Clipboard API', async () => {
    vi.mocked(tauriReadText).mockResolvedValue('Shako');

    expect(await readText()).toBe('Shako');
    expect(navigator.clipboard.readText).not.toHaveBeenCalled();
  });

  it('returns null when the plugin read fails (e.g. clipboard holds an image)', async () => {
    vi.mocked(tauriReadText).mockRejectedValue(new Error('not text'));

    expect(await readText()).toBeNull();
  });

  it('rethrows plugin write failures so callers can surface them', async () => {
    const failure = new Error('denied');
    vi.mocked(tauriWriteText).mockRejectedValue(failure);

    await expect(writeText('x')).rejects.toBe(failure);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  describe('while another app holds the clipboard (Windows)', () => {
    const occupied = () => new Error('The native clipboard is not accessible due to being held by another party.');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.mocked(tauriWriteText).mockReset();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries until the clipboard is free', async () => {
      vi.mocked(tauriWriteText).mockRejectedValueOnce(occupied()).mockRejectedValueOnce(occupied()).mockResolvedValue();

      const write = writeText('/w *seller hi');
      await vi.runAllTimersAsync();

      await expect(write).resolves.toBeUndefined();
      expect(tauriWriteText).toHaveBeenCalledTimes(3);
    });

    it('gives up and rethrows after the last retry', async () => {
      const failure = occupied();
      vi.mocked(tauriWriteText).mockRejectedValue(failure);

      const write = writeText('x');
      const settled = expect(write).rejects.toBe(failure);
      await vi.runAllTimersAsync();

      await settled;
      expect(tauriWriteText).toHaveBeenCalledTimes(4);
    });

    it('does not retry other write failures', async () => {
      vi.mocked(tauriWriteText).mockRejectedValue(new Error('denied'));

      await expect(writeText('x')).rejects.toThrow('denied');
      expect(tauriWriteText).toHaveBeenCalledTimes(1);
    });
  });
});

describe('browser mode', () => {
  beforeEach(() => {
    tauri.value = false;
  });

  it('reads via navigator.clipboard', async () => {
    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn().mockResolvedValue('Jah') } });

    expect(await readText()).toBe('Jah');
    expect(tauriReadText).not.toHaveBeenCalled();
  });

  it('returns null when the Clipboard API is missing or the read is rejected', async () => {
    vi.stubGlobal('navigator', {});
    expect(await readText()).toBeNull();

    vi.stubGlobal('navigator', { clipboard: { readText: vi.fn().mockRejectedValue(new Error('NotAllowed')) } });
    expect(await readText()).toBeNull();
  });

  it('writes via navigator.clipboard', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: write } });

    await writeText('Ber');

    expect(write).toHaveBeenCalledWith('Ber');
    expect(tauriWriteText).not.toHaveBeenCalled();
  });

  it('throws when the Clipboard API is unavailable for writing', async () => {
    vi.stubGlobal('navigator', {});

    await expect(writeText('x')).rejects.toThrow('Clipboard API not available');
  });
});
