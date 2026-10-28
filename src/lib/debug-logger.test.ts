import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type * as DebugLoggerModule from './debug-logger';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@/lib/browser-fs';

const tauri = vi.hoisted(() => ({ value: true }));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => tauri.value, invoke: vi.fn() }));
vi.mock('@/lib/browser-fs', () => ({ readTextFile: vi.fn(), BaseDirectory: { AppConfig: 13 } }));

let logger: typeof DebugLoggerModule;
let original: { log: MockInstance; warn: MockInstance; error: MockInstance };

/** Raw `entries` chunks sent to the backend, one per flush. */
function sentChunks(): string[] {
  return vi
    .mocked(invoke)
    .mock.calls.filter(([cmd]) => cmd === 'write_debug_logs')
    .map(([, args]) => (args && typeof args === 'object' && 'entries' in args ? String(args.entries) : ''));
}

/** `set_debug_logging` values sent to the backend, in order. */
function nativeToggles(): unknown[] {
  return vi
    .mocked(invoke)
    .mock.calls.filter(([cmd]) => cmd === 'set_debug_logging')
    .map(([, args]) => (args && typeof args === 'object' && 'enabled' in args ? args.enabled : undefined));
}

/** Entries sent to the backend across all flushes, without timestamps. */
function flushedEntries(): string[] {
  return sentChunks()
    .flatMap((chunk) => chunk.split('\n'))
    .filter(Boolean)
    .map((line) => line.replace(/^\[[^\]]+\] /, ''));
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T12:00:00.000Z'));
  tauri.value = true;
  // Spies are installed before import so the module captures them as the "original" console.
  original = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  };
  vi.mocked(invoke).mockResolvedValue(undefined);
  // Fresh module per test: debug-logger keeps its buffer/active flag and the captured console in module state.
  vi.resetModules();
  logger = await import('./debug-logger');
});

afterEach(() => {
  logger.stopDebugLogging();
  vi.useRealTimers();
});

describe('startDebugLogging', () => {
  it('still prints to the console and ships timestamped, leveled entries every 2s', async () => {
    logger.startDebugLogging();

    console.log('price', 12, { hr: 1.5 });
    console.warn('slow');
    console.error(new Error('boom'));

    expect(original.log).toHaveBeenCalledWith('price', 12, { hr: 1.5 });
    expect(sentChunks()).toEqual([]);

    await vi.advanceTimersByTimeAsync(2000);

    expect(sentChunks()[0].startsWith('[2026-10-18T12:00:00.000Z] [LOG] price 12 {"hr":1.5}\n')).toBe(true);
    const entries = flushedEntries();
    expect(entries[0]).toBe('[LOG] price 12 {"hr":1.5}');
    expect(entries[1]).toBe('[WARN] slow');
    expect(entries[2]).toBe('[ERROR] boom');
    expect(entries.some((l) => l.startsWith('    at '))).toBe(true);
  });

  it('logs unserializable objects instead of throwing', async () => {
    logger.startDebugLogging();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => console.log('state', circular)).not.toThrow();
    await vi.advanceTimersByTimeAsync(2000);

    expect(flushedEntries()).toEqual(['[LOG] state [object Object]']);
  });

  it('does not flush when nothing was logged', async () => {
    logger.startDebugLogging();

    await vi.advanceTimersByTimeAsync(6000);

    expect(sentChunks()).toEqual([]);
  });

  it('is idempotent: starting twice records each line once', async () => {
    logger.startDebugLogging();
    logger.startDebugLogging();

    console.log('once');
    await vi.advanceTimersByTimeAsync(2000);

    expect(flushedEntries()).toEqual(['[LOG] once']);
  });

  it('drops entries outside Tauri instead of piling them up', async () => {
    tauri.value = false;
    logger.startDebugLogging();
    console.log('browser only');
    await vi.advanceTimersByTimeAsync(2000);

    tauri.value = true;
    console.log('later');
    await vi.advanceTimersByTimeAsync(2000);

    expect(flushedEntries()).toEqual(['[LOG] later']);
  });

  it('reports a failed flush via the original console without re-capturing it', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === 'write_debug_logs') throw new Error('disk full');
    });
    logger.startDebugLogging();
    console.log('a');

    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(original.error).toHaveBeenCalledWith('[debug-logger] Failed to flush logs:', expect.any(Error));
    expect(sentChunks()).toHaveLength(1);
  });
});

describe('stopDebugLogging', () => {
  it('restores the console, flushes pending entries and stops the timer', async () => {
    logger.startDebugLogging();
    console.warn('pending');

    logger.stopDebugLogging();
    await Promise.resolve();

    expect(console.warn).toBe(original.warn);
    expect(flushedEntries()).toEqual(['[WARN] pending']);

    console.log('after stop');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sentChunks()).toHaveLength(1);
  });

  it('turns native (window/focus) logging on with the capture and off again', () => {
    logger.startDebugLogging();
    logger.startDebugLogging();
    logger.stopDebugLogging();
    logger.stopDebugLogging();

    expect(nativeToggles()).toEqual([true, false]);
  });
});

describe('initDebugLoggingFromSettings', () => {
  it('starts logging when settings.json enables it', async () => {
    vi.mocked(readTextFile).mockResolvedValue(JSON.stringify({ debugLoggingEnabled: true }));

    await logger.initDebugLoggingFromSettings();
    console.log('captured');
    await vi.advanceTimersByTimeAsync(2000);

    expect(flushedEntries()).toEqual(['[LOG] captured']);
  });

  it.each([
    ['disabled', async () => JSON.stringify({ debugLoggingEnabled: false })],
    ['missing file', async () => Promise.reject(new Error('not found'))],
    ['corrupt file', async () => '{oops'],
  ])('stays off when settings are %s', async (_case, read) => {
    vi.mocked(readTextFile).mockImplementation(read);

    await logger.initDebugLoggingFromSettings();

    expect(console.log).toBe(original.log);
  });
});
