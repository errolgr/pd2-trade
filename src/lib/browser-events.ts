/**
 * Subscriptions to events emitted by the Rust side (chat watcher, Diablo focus, plugin events).
 *
 * The frontend emits app events only between Main and the sign-in window (hooks/useSignIn); other UI actions
 * go through the overlay API (`@/overlay`) and data through providers. In browser mode (`isTauri() === false`)
 * there is no Rust side, so `listen` is a
 * no-op that resolves to a harmless unlisten function.
 */

import { isTauri } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';

type EventCallback<T = any> = (event: { payload: T }) => void;

const noop = () => {};

/** Browser dev builds: listeners `emitDevEvent` reaches, standing in for the Rust side in smoke tests. */
const devListeners = new Map<string, Set<EventCallback>>();

/** Listen to a Rust-emitted event; resolves to the unlisten function. */
export async function listen<T = any>(event: string, callback: EventCallback<T>): Promise<() => void> {
  if (!isTauri()) {
    if (!import.meta.env.DEV) return noop;
    let set = devListeners.get(event);
    if (!set) devListeners.set(event, (set = new Set()));
    set.add(callback);
    return () => void set.delete(callback);
  }
  return await tauriListen<T>(event, callback);
}

/** Dev builds in a browser only: delivers `payload` to `listen(event)` subscribers as if Rust emitted it. */
export function emitDevEvent<T>(event: string, payload: T): void {
  if (isTauri() || !import.meta.env.DEV) return;
  devListeners.get(event)?.forEach((callback) => callback({ payload }));
}
