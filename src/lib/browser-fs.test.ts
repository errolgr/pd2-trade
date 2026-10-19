// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exists as tauriExists,
  readTextFile as tauriReadTextFile,
  writeTextFile as tauriWriteTextFile,
} from '@tauri-apps/plugin-fs';
import { BaseDirectory, exists, mkdir, readTextFile, writeTextFile } from './browser-fs';

const tauri = vi.hoisted(() => ({ value: false }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value }));
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
}));

afterEach(() => {
  tauri.value = false;
  localStorage.clear();
});

describe('browser mode (localStorage)', () => {
  it('round-trips file contents', async () => {
    expect(await exists('settings.json', { baseDir: BaseDirectory.AppConfig })).toBe(false);

    await writeTextFile('settings.json', '{"a":1}', { baseDir: BaseDirectory.AppConfig });

    expect(await exists('settings.json', { baseDir: BaseDirectory.AppConfig })).toBe(true);
    expect(await readTextFile('settings.json', { baseDir: BaseDirectory.AppConfig })).toBe('{"a":1}');
  });

  it('overwrites on repeated writes and keeps empty files readable', async () => {
    await writeTextFile('f.txt', 'first');
    await writeTextFile('f.txt', '');

    expect(await exists('f.txt')).toBe(true);
    expect(await readTextFile('f.txt')).toBe('');
  });

  it('keeps the same path under different base directories separate', async () => {
    await writeTextFile('data.json', 'config', { baseDir: BaseDirectory.AppConfig });
    await writeTextFile('data.json', 'cache', { baseDir: BaseDirectory.AppCache });

    expect(await readTextFile('data.json', { baseDir: BaseDirectory.AppConfig })).toBe('config');
    expect(await readTextFile('data.json', { baseDir: BaseDirectory.AppCache })).toBe('cache');
    expect(await exists('data.json')).toBe(false);
  });

  it('rejects reading a missing file with the path in the message', async () => {
    await expect(readTextFile('nope.json', { baseDir: BaseDirectory.AppConfig })).rejects.toThrow(
      'File not found: nope.json',
    );
  });

  it('does not make mkdir create a readable file at the directory path', async () => {
    await mkdir('logs', { baseDir: BaseDirectory.AppConfig, recursive: true });

    await expect(readTextFile('logs', { baseDir: BaseDirectory.AppConfig })).rejects.toThrow('File not found');
  });

  it('never touches the Tauri fs plugin', async () => {
    await writeTextFile('a', 'b');
    await readTextFile('a');
    await exists('a');

    expect(tauriWriteTextFile).not.toHaveBeenCalled();
    expect(tauriReadTextFile).not.toHaveBeenCalled();
    expect(tauriExists).not.toHaveBeenCalled();
  });
});

describe('Tauri mode', () => {
  it('uses the fs plugin and leaves localStorage untouched', async () => {
    tauri.value = true;
    vi.mocked(tauriReadTextFile).mockResolvedValue('from disk');
    vi.mocked(tauriExists).mockResolvedValue(true);

    await writeTextFile('settings.json', 'x', { baseDir: BaseDirectory.AppConfig });
    const read = await readTextFile('settings.json', { baseDir: BaseDirectory.AppConfig });
    const present = await exists('missing-in-storage.json');

    expect(read).toBe('from disk');
    expect(present).toBe(true);
    expect(localStorage.length).toBe(0);
  });
});
