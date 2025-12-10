/**
 * Browser-compatible event system
 * Uses Tauri events in Tauri environment, falls back to CustomEvent in browser
 */

import { isTauri } from '@tauri-apps/api/core';

type EventCallback<T = any> = (event: { payload: T }) => void;

const eventListeners = new Map<string, Set<EventCallback>>();

/**
 * Emit an event
 */
export async function emit<T = any>(event: string, payload?: T): Promise<void> {
  if (isTauri()) {
    const { emit: tauriEmit } = await import('@tauri-apps/api/event');
    await tauriEmit(event, payload);
    return;
  }
  
  // Browser fallback: use CustomEvent
  const customEvent = new CustomEvent(event, { detail: payload });
  window.dispatchEvent(customEvent);
  
  // Also call registered listeners directly
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback({ payload });
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
}

/**
 * Listen to an event
 */
export async function listen<T = any>(
  event: string,
  callback: EventCallback<T>
): Promise<() => void> {
  if (isTauri()) {
    const { listen: tauriListen } = await import('@tauri-apps/api/event');
    return await tauriListen<T>(event, callback);
  }
  
  // Browser fallback: use CustomEvent
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<T>;
    callback({ payload: customEvent.detail });
  };
  
  window.addEventListener(event, handler);
  
  // Also register in our listener map
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);
  
  // Return unlisten function
  return () => {
    window.removeEventListener(event, handler);
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListeners.delete(event);
      }
    }
  };
}

