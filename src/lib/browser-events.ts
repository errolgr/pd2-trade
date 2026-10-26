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

/** Listen to a Rust-emitted event; resolves to the unlisten function. */
export async function listen<T = any>(event: string, callback: EventCallback<T>): Promise<() => void> {
  if (!isTauri()) return noop;
  return await tauriListen<T>(event, callback);
}
