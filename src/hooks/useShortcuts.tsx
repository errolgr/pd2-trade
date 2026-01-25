import { useEffect, useRef, useMemo } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { listen } from '@/lib/browser-events';
import { useOptions } from './useOptions';

type ShortcutHandler = () => void | Promise<void>;

interface ShortcutConfig {
  modifier: 'ctrl' | 'alt';
  key: string;
  handler: ShortcutHandler;
}

const formatShortcut = (modifier: 'ctrl' | 'alt', key: string): string => {
  return `${modifier === 'ctrl' ? 'Control' : 'Alt'}+${key.toUpperCase()}`;
};

export const useShortcuts = (shortcuts: ShortcutConfig[]) => {
  const registeredShortcuts = useRef<string[]>([]);
  const shortcutsRef = useRef<ShortcutConfig[]>(shortcuts);
  const lastFocusState = useRef<boolean | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const operationChain = useRef<Promise<void>>(Promise.resolve());
  const isInitializedRef = useRef(false);
  const handlerRefs = useRef<Map<string, ShortcutHandler>>(new Map());
  const previousShortcutsKeyRef = useRef<string>('');

  // Keep shortcuts ref up to date and update handler refs
  useEffect(() => {
    shortcutsRef.current = shortcuts;
    // Update handler refs map immediately so handlers are always current
    shortcuts.forEach(({ modifier, key, handler }) => {
      const shortcut = formatShortcut(modifier, key);
      handlerRefs.current.set(shortcut, handler);
    });
  }, [shortcuts]);

  useEffect(() => {
    if (!isTauri()) {
      // Global shortcuts not available in browser
      return;
    }

    const unregisterAllShortcuts = async () => {
      await Promise.all(registeredShortcuts.current.map((shortcut) => unregister(shortcut).catch(() => {})));
      registeredShortcuts.current = [];
    };

    // Serialize operations to prevent races between cleanup/setup/events
    const scheduleOperation = (op: () => Promise<void>) => {
      operationChain.current = operationChain.current
        .then(op)
        .catch((err) => console.error('Shortcut operation failed:', err));
    };

    const registerShortcuts = async () => {
      try {
        const currentShortcutKeys = shortcutsRef.current.map(({ modifier, key }) => formatShortcut(modifier, key));
        const registeredKeys = new Set(registeredShortcuts.current);

        // Unregister shortcuts that are no longer needed
        const toUnregister = registeredShortcuts.current.filter((key) => !currentShortcutKeys.includes(key));
        if (toUnregister.length > 0) {
          await Promise.all(toUnregister.map((shortcut) => unregister(shortcut).catch(() => {})));
          registeredShortcuts.current = registeredShortcuts.current.filter((key) => !toUnregister.includes(key));
        }

        // Register new shortcuts and update handlers for existing ones
        await Promise.all(
          shortcutsRef.current.map(async ({ modifier, key, handler }) => {
            const shortcut = formatShortcut(modifier, key);
            // Store handler in refs map
            handlerRefs.current.set(shortcut, handler);

            // Only register if not already registered
            if (!registeredKeys.has(shortcut)) {
              try {
                await register(shortcut, (e) => {
                  if (e.state === 'Pressed') {
                    // Get the latest handler from refs
                    const currentHandler = handlerRefs.current.get(shortcut);
                    if (currentHandler) {
                      try {
                        currentHandler();
                      } catch (error) {
                        console.error(`Error executing shortcut handler for ${shortcut}:`, error);
                      }
                    } else {
                      console.warn(`No handler found for shortcut ${shortcut}`);
                    }
                  }
                });
                registeredShortcuts.current.push(shortcut);
              } catch (error: any) {
                const msg = error ? error.toString().toLowerCase() : '';
                if (msg.includes('already') || msg.includes('exists') || msg.includes('conflict')) {
                  registeredShortcuts.current.push(shortcut);
                } else {
                  console.error(`Failed to register shortcut ${shortcut}:`, error);
                }
              }
            }
            // If already registered, handler ref is already updated above, so the callback will use the new handler
          }),
        );
      } catch (error) {
        console.error('Failed to load global shortcut plugin:', error);
      }
    };

    const setup = async () => {
      try {
        // OP REQ: Always initialize assuming D2 is focused
        // We schedule registration immediately.
        scheduleOperation(async () => {
          // Optimistically set focused
          lastFocusState.current = true;
          await registerShortcuts();
        });

        // 1. Check actual state to correct if needed
        const isFocused = await invoke<boolean>('is_diablo_focused');

        scheduleOperation(async () => {
          // Update state based on reality
          if (lastFocusState.current !== isFocused) {
            lastFocusState.current = isFocused;
            if (isFocused) await registerShortcuts();
            else await unregisterAllShortcuts();
          }
        });

        // 2. Listen for changes
        unlistenRef.current = await listen<boolean>('diablo-focus-changed', async ({ payload: isFocused }) => {
          scheduleOperation(async () => {
            if (lastFocusState.current === isFocused) return;
            lastFocusState.current = isFocused;

            if (isFocused) await registerShortcuts();
            else await unregisterAllShortcuts();
          });
        });

        isInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to setup shortcut listener:', error);
      }
    };

    setup();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
      // Cleanup: Unregister
      scheduleOperation(async () => {
        await unregisterAllShortcuts();
      });
    };
  }, []);

  // Re-register shortcuts when they change (if Diablo is focused and initialized)
  useEffect(() => {
    if (!isTauri() || !isInitializedRef.current) {
      return;
    }

    // Create a key to detect actual shortcut changes (modifier+key combinations)
    const shortcutsKey = JSON.stringify(shortcuts.map((s) => `${s.modifier}+${s.key}`).sort());

    // Skip if shortcuts haven't actually changed (only handlers might have changed)
    if (previousShortcutsKeyRef.current === shortcutsKey) {
      // Just update handler refs, don't re-register
      shortcuts.forEach(({ modifier, key, handler }) => {
        const shortcut = formatShortcut(modifier, key);
        handlerRefs.current.set(shortcut, handler);
      });
      return;
    }

    previousShortcutsKeyRef.current = shortcutsKey;

    // Update handler refs immediately when shortcuts change
    shortcuts.forEach(({ modifier, key, handler }) => {
      const shortcut = formatShortcut(modifier, key);
      handlerRefs.current.set(shortcut, handler);
    });

    const scheduleOperation = (op: () => Promise<void>) => {
      operationChain.current = operationChain.current
        .then(op)
        .catch((err) => console.error('Shortcut operation failed:', err));
    };

    const unregisterAllShortcuts = async () => {
      await Promise.all(registeredShortcuts.current.map((shortcut) => unregister(shortcut).catch(() => {})));
      registeredShortcuts.current = [];
    };

    const registerShortcuts = async () => {
      try {
        const currentShortcutKeys = shortcutsRef.current.map(({ modifier, key }) => formatShortcut(modifier, key));
        const registeredKeys = new Set(registeredShortcuts.current);

        // Unregister shortcuts that are no longer needed
        const toUnregister = registeredShortcuts.current.filter((key) => !currentShortcutKeys.includes(key));
        if (toUnregister.length > 0) {
          await Promise.all(toUnregister.map((shortcut) => unregister(shortcut).catch(() => {})));
          registeredShortcuts.current = registeredShortcuts.current.filter((key) => !toUnregister.includes(key));
        }

        // Register new shortcuts and update handlers for existing ones
        await Promise.all(
          shortcutsRef.current.map(async ({ modifier, key, handler }) => {
            const shortcut = formatShortcut(modifier, key);
            // Store handler in refs map (ensure it's up to date)
            handlerRefs.current.set(shortcut, handler);

            // Only register if not already registered
            if (!registeredKeys.has(shortcut)) {
              try {
                await register(shortcut, (e) => {
                  if (e.state === 'Pressed') {
                    // Get the latest handler from refs
                    const currentHandler = handlerRefs.current.get(shortcut);
                    if (currentHandler) {
                      try {
                        currentHandler();
                      } catch (error) {
                        console.error(`Error executing shortcut handler for ${shortcut}:`, error);
                      }
                    } else {
                      console.warn(`No handler found for shortcut ${shortcut}`);
                    }
                  }
                });
                registeredShortcuts.current.push(shortcut);
              } catch (error: any) {
                const msg = error ? error.toString().toLowerCase() : '';
                if (msg.includes('already') || msg.includes('exists') || msg.includes('conflict')) {
                  registeredShortcuts.current.push(shortcut);
                } else {
                  console.error(`Failed to register shortcut ${shortcut}:`, error);
                }
              }
            }
            // If already registered, handler ref is already updated above, so the callback will use the new handler
          }),
        );
      } catch (error) {
        console.error('Failed to load global shortcut plugin:', error);
      }
    };

    // Re-register shortcuts if Diablo is currently focused
    scheduleOperation(async () => {
      if (lastFocusState.current === true) {
        await registerShortcuts();
      }
    });
  }, [shortcuts]);
};

export const useAppShortcuts = (
  onItemSearch: ShortcutHandler,
  onQuickList: ShortcutHandler,
  onCurrencyValuation: ShortcutHandler,
  onChat?: ShortcutHandler,
  onOffers?: ShortcutHandler,
  onCommandMenu?: ShortcutHandler,
) => {
  const { settings, isLoading } = useOptions();

  const shortcuts = useMemo<ShortcutConfig[]>(() => {
    if (isLoading) return [];

    const configs: ShortcutConfig[] = [];

    if (settings.hotkeyKey) {
      configs.push({
        modifier: settings.hotkeyModifier,
        key: settings.hotkeyKey,
        handler: onItemSearch,
      });
    }

    if (settings.hotkeyKeyListItem) {
      configs.push({
        modifier: settings.hotkeyModifierListItem,
        key: settings.hotkeyKeyListItem,
        handler: onQuickList,
      });
    }

    if (settings.hotkeyKeyCurrencyValuation) {
      configs.push({
        modifier: settings.hotkeyModifierCurrencyValuation,
        key: settings.hotkeyKeyCurrencyValuation,
        handler: onCurrencyValuation,
      });
    }

    if (settings.hotkeyKeyChat && onChat) {
      configs.push({
        modifier: settings.hotkeyModifierChat,
        key: settings.hotkeyKeyChat,
        handler: onChat,
      });
    }

    if (settings.hotkeyKeyOffers && onOffers) {
      configs.push({
        modifier: settings.hotkeyModifierOffers,
        key: settings.hotkeyKeyOffers,
        handler: onOffers,
      });
    }

    if (settings.hotkeyKeyCommandMenu && onCommandMenu && !settings.commandMenuUseDoubleShift) {
      configs.push({
        modifier: settings.hotkeyModifierCommandMenu || 'ctrl',
        key: settings.hotkeyKeyCommandMenu,
        handler: onCommandMenu,
      });
    }

    return configs;
  }, [
    isLoading,
    settings.hotkeyModifier,
    settings.hotkeyKey,
    settings.hotkeyModifierListItem,
    settings.hotkeyKeyListItem,
    settings.hotkeyModifierCurrencyValuation,
    settings.hotkeyKeyCurrencyValuation,
    settings.hotkeyModifierChat,
    settings.hotkeyKeyChat,
    settings.hotkeyModifierOffers,
    settings.hotkeyKeyOffers,
    settings.hotkeyModifierCommandMenu,
    settings.hotkeyKeyCommandMenu,
    settings.commandMenuUseDoubleShift,
    onItemSearch,
    onQuickList,
    onCurrencyValuation,
    onChat,
    onOffers,
    onCommandMenu,
  ]);

  useShortcuts(shortcuts);
};
