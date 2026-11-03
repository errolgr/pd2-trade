import { useCallback, useSyncExternalStore } from 'react';
import type { ChatMessage } from '@pd2-trader/plugin-sdk';
import { pluginHost } from '@/plugins/host/manager';
import { usePluginHost, type SlotResult } from '@/plugins/ui/hooks';

export type MessageSlot = 'chat.decorate' | 'chat.action';

interface CachedCall {
  results: SlotResult<MessageSlot>[];
  listeners: Set<() => void>;
}

/** Messages remembered per slot and plugin set; rows virtualized back in reuse their results. */
const CACHE_LIMIT = 500;
const cache = new Map<string, CachedCall>();
const NONE: SlotResult<MessageSlot>[] = [];

function start(slot: MessageSlot, input: ChatMessage): CachedCall {
  const entry: CachedCall = { results: [], listeners: new Set() };
  const calls = pluginHost.callSlot(slot, input);
  entry.results = calls.map((c) => ({ pluginId: c.pluginId, pluginName: c.pluginName, state: 'loading' }));
  const settle = (index: number, result: SlotResult<MessageSlot>) => {
    const next = entry.results.slice();
    next[index] = result;
    entry.results = next;
    entry.listeners.forEach((notify) => notify());
  };
  calls.forEach((call, index) =>
    call.result.then(
      (value) => settle(index, { pluginId: call.pluginId, pluginName: call.pluginName, state: 'ok', value }),
      (error: unknown) =>
        settle(index, {
          pluginId: call.pluginId,
          pluginName: call.pluginName,
          state: 'error',
          error: error instanceof Error ? error.message : String(error),
        }),
    ),
  );
  return entry;
}

/**
 * `chat.decorate` / `chat.action` for one chat message: each message is asked once per running plugin set
 * (keyed by `messageKey`, e.g. the timeline entry key), never again on re-render or when its row scrolls back
 * in. Without a running plugin implementing `slot` nothing is built or called.
 */
export function useMessagePluginSlot<S extends MessageSlot>(
  slot: S,
  input: (() => ChatMessage | null) | null,
  messageKey: string,
): SlotResult<S>[] {
  const host = usePluginHost();
  const pluginsKey = host.plugins
    .filter((p) => p.status === 'running' && p.manifest?.slots.includes(slot))
    .map((p) => `${p.installed.id}@${p.installed.version}`)
    .join(',');
  const cacheKey = input && pluginsKey ? `${slot}|${pluginsKey}|${messageKey}` : null;

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!cacheKey || !input) return () => {};
      let entry = cache.get(cacheKey);
      if (!entry) {
        const message = input();
        if (!message) return () => {};
        entry = start(slot, message);
        cache.set(cacheKey, entry);
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
        notify();
      }
      const listeners = entry.listeners;
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    // `input` is a fresh closure every render; the cache key captures what it builds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, slot],
  );
  const getSnapshot = () => (cacheKey ? (cache.get(cacheKey)?.results ?? NONE) : NONE);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as SlotResult<S>[];
}
