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

  // Keep shortcuts ref up to date
  useEffect(() => {
    shortcutsRef.current = shortcuts;
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
        // Unregister previous shortcuts first
        await unregisterAllShortcuts();

        // Register new shortcuts in parallel
        await Promise.all(
          shortcutsRef.current.map(async ({ modifier, key, handler }) => {
            const shortcut = formatShortcut(modifier, key);
            try {
              await register(shortcut, (e) => {
                if (e.state === 'Pressed') {
                  handler();
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
  }, [shortcuts]);
};

export const useAppShortcuts = (
  onItemSearch: ShortcutHandler,
  onQuickList: ShortcutHandler,
  onCurrencyValuation: ShortcutHandler,
  onChat?: ShortcutHandler,
  onOffers?: ShortcutHandler,
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
    onItemSearch,
    onQuickList,
    onCurrencyValuation,
    onChat,
    onOffers,
  ]);

  useShortcuts(shortcuts);
};
