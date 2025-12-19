import { useEffect, useRef, useMemo } from 'react';
import { isTauri } from '@tauri-apps/api/core';
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
      for (const shortcut of registeredShortcuts.current) {
        try {
          await unregister(shortcut);
        } catch {
          // Ignore errors
        }
      }
      registeredShortcuts.current = [];
    };

    const registerShortcuts = async () => {
      try {
        // Unregister previous shortcuts first
        await unregisterAllShortcuts();

        // Register new shortcuts
        for (const { modifier, key, handler } of shortcutsRef.current) {
          const shortcut = formatShortcut(modifier, key);
          try {
            await register(shortcut, (e) => {
              if (e.state === 'Pressed') {
                handler();
              }
            });
            registeredShortcuts.current.push(shortcut);
          } catch (error) {
            console.error(`Failed to register shortcut ${shortcut}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to load global shortcut plugin:', error);
      }
    };

    // On other platforms, listen for Diablo focus changes
    let unlisten: (() => void) | null = null;

    listen<boolean>('diablo-focus-changed', async ({ payload: isFocused }) => {
      // Prevent duplicate events or re(un)registering if state hasn't changed
      if (lastFocusState.current === isFocused) {
        return;
      }
      lastFocusState.current = isFocused;

      if (isFocused) {
        // Diablo gained focus - register hotkeys
        await registerShortcuts();
      } else {
        // Diablo lost focus - unregister hotkeys
        await unregisterAllShortcuts();
      }
    })
      .then((off) => {
        unlisten = off;
      })
      .catch((error) => {
        console.error('Failed to listen for diablo-focus-changed event:', error);
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
      // Unregister all shortcuts on cleanup
      unregisterAllShortcuts().catch(() => void 0);
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
