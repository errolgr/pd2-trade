import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CallableSlotId, JsonValue, SlotInput, SlotOutput } from '@pd2-trader/plugin-sdk';
import { showToast } from '@/overlay';
import { t } from '@/i18n';
import { pluginHost, type PluginHostSnapshot } from '../host/manager';

/** Plugin host state (installed plugins, consent queue, panels, themes); re-renders on every change. */
export function usePluginHost(): PluginHostSnapshot {
  return useSyncExternalStore(pluginHost.subscribe, pluginHost.getSnapshot, pluginHost.getSnapshot);
}

export type SlotResult<S extends CallableSlotId> =
  | { pluginId: string; pluginName: string; state: 'loading' }
  | { pluginId: string; pluginName: string; state: 'ok'; value: SlotOutput<S> }
  | { pluginId: string; pluginName: string; state: 'error'; error: string };

/**
 * Calls `slot` on every running plugin that implements it and returns one result per plugin as each settles
 * (core content renders first; plugin output fills in, or an error chip after the 300 ms budget).
 *
 * `input` is a factory so surfaces don't build plugin inputs when no plugin uses the slot. The slot re-runs
 * when `key` changes (e.g. the item or row ids) or the set of running plugins changes; `retry()` re-runs it.
 */
export function usePluginSlot<S extends CallableSlotId>(
  slot: S,
  input: (() => SlotInput<S>) | null,
  key: string,
): { results: SlotResult<S>[]; retry: () => void } {
  const host = usePluginHost();
  const [results, setResults] = useState<SlotResult<S>[]>([]);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef(input);
  // Layout effect: runs before the slot effect below in the same commit, so it sees this render's factory.
  useLayoutEffect(() => {
    inputRef.current = input;
  });
  // Running plugins that declare the slot: a plugin starting/stopping re-runs the slot.
  const pluginsKey = host.plugins
    .filter((p) => p.status === 'running' && p.manifest?.slots.includes(slot))
    .map((p) => `${p.installed.id}@${p.installed.version}`)
    .join(',');

  useEffect(() => {
    const build = inputRef.current;
    if (!build || !pluginsKey) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const calls = pluginHost.callSlot(slot, build());
    setResults(calls.map((c) => ({ pluginId: c.pluginId, pluginName: c.pluginName, state: 'loading' })));
    calls.forEach((call, index) => {
      call.result.then(
        (value) => {
          if (cancelled) return;
          setResults((prev) => replaceAt(prev, index, { pluginId: call.pluginId, pluginName: call.pluginName, state: 'ok', value }));
        },
        (error: unknown) => {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : String(error);
          setResults((prev) =>
            replaceAt(prev, index, { pluginId: call.pluginId, pluginName: call.pluginName, state: 'error', error: message }),
          );
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [slot, key, pluginsKey, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { results, retry };
}

function replaceAt<T>(list: T[], index: number, value: T): T[] {
  const next = list.slice();
  next[index] = value;
  return next;
}

/** Runs a plugin command from a slot button; failures surface as a toast. */
export function runPluginCommand(pluginId: string, commandId: string, args?: JsonValue): void {
  pluginHost.runCommand(pluginId, commandId, args).catch((error: unknown) => {
    showToast({
      title: t('plugins:command.failed'),
      description: error instanceof Error ? error.message : String(error),
      variant: 'error',
    });
  });
}
