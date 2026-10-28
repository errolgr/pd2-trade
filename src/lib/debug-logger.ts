import { invoke, isTauri } from '@tauri-apps/api/core';
import { readTextFile, BaseDirectory } from '@/lib/browser-fs';

const FLUSH_INTERVAL = 2000;

let buffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let active = false;

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

function formatEntry(level: string, args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const message = args
    .map((a) => {
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(' ');
  return `[${timestamp}] [${level}] ${message}`;
}

async function flush() {
  if (buffer.length === 0) return;

  const chunk = buffer.join('\n') + '\n';
  buffer = [];

  if (!isTauri()) return;

  try {
    await invoke('write_debug_logs', { entries: chunk });
  } catch (err) {
    originalConsole.error('[debug-logger] Failed to flush logs:', err);
  }
}

/** Native code (window/focus events) writes to the same debug.log only while the setting is on. */
function setNativeLogging(enabled: boolean) {
  if (!isTauri()) return;
  invoke('set_debug_logging', { enabled }).catch((err) =>
    originalConsole.error('[debug-logger] Failed to toggle native logging:', err),
  );
}

export function startDebugLogging() {
  if (active) return;
  active = true;

  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    buffer.push(formatEntry('LOG', args));
  };

  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    buffer.push(formatEntry('WARN', args));
  };

  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    buffer.push(formatEntry('ERROR', args));
  };

  flushTimer = setInterval(flush, FLUSH_INTERVAL);
  setNativeLogging(true);
  originalConsole.log('[debug-logger] Debug logging started');
}

/**
 * Reads settings.json directly and starts logging if debugLoggingEnabled is true.
 * Called at app startup in main.tsx, before OptionsProvider has loaded settings.
 * Toggle changes afterwards are applied by OptionsProvider (start/stopDebugLogging).
 */
export async function initDebugLoggingFromSettings() {
  try {
    const raw = await readTextFile('settings.json', { baseDir: BaseDirectory.AppConfig });
    const settings = JSON.parse(raw);
    if (settings.debugLoggingEnabled) {
      startDebugLogging();
    }
  } catch {
    // Settings file doesn't exist yet or parse error — no-op
  }
}

export function stopDebugLogging() {
  if (!active) return;
  active = false;

  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;

  flush();
  setNativeLogging(false);

  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  originalConsole.log('[debug-logger] Debug logging stopped');
}
