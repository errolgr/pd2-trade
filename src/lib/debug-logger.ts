import { invoke, isTauri } from '@tauri-apps/api/core';
import { readTextFile, BaseDirectory } from '@/lib/browser-fs';
import { listen } from '@/lib/browser-events';

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
  originalConsole.log('[debug-logger] Debug logging started');
}

/**
 * Reads settings.json directly and starts logging if debugLoggingEnabled is true.
 * Called at app startup in main.tsx so all windows get the interceptor.
 * Also listens for settings-updated events to respond to toggle changes.
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

  // Listen for settings changes to start/stop logging dynamically
  listen<any>('settings-updated', (event) => {
    const settings = event.payload;
    if (settings?.debugLoggingEnabled) {
      startDebugLogging();
    } else {
      stopDebugLogging();
    }
  });
}

export function stopDebugLogging() {
  if (!active) return;
  active = false;

  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;

  flush();

  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  originalConsole.log('[debug-logger] Debug logging stopped');
}
