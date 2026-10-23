import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import { useOverlay } from '@/overlay';
import { listen } from '@/lib/browser-events';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { appConfigDir } from '@tauri-apps/api/path';
import * as Sentry from '@sentry/react';
import { openPath } from '@tauri-apps/plugin-opener';
import { exit } from '@tauri-apps/plugin-process';

type TrayContextValue = {
  tray: any | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

// The tray lives in Rust and outlives the page, so every reload or remount would add another icon
// unless the previous one (found by this fixed id) is removed first. Queued so create/remove never interleave.
const TRAY_ID = 'pd2-trader';
let trayQueue: Promise<void> = Promise.resolve();
const queueTray = (op: () => Promise<void>) => {
  trayQueue = trayQueue.then(op).catch((err) => console.error('Tray operation failed:', err));
};

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<any | null>(null);
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const trayRef = useRef<any | null>(null);
  const lastShortcutRef = useRef<string | null>(null);
  // Register global shortcut for opening settings (only when Diablo is focused)
  useEffect(() => {
    if (!isTauri() || !settings?.hotkeyModifierSettings || !settings?.hotkeyKeySettings) return;

    const shortcut = `${settings.hotkeyModifierSettings}+${settings.hotkeyKeySettings}`.toLowerCase();

    const unregisterShortcut = async () => {
      if (lastShortcutRef.current) {
        try {
          await unregister(lastShortcutRef.current);
          lastShortcutRef.current = null;
        } catch {
          // Ignore errors
        }
      }
    };

    const registerShortcut = async () => {
      try {
        // Unregister previous shortcut first
        await unregisterShortcut();

        if (!(await isRegistered(shortcut))) {
          await register(shortcut, (event) => {
            if (event.state === 'Pressed') {
              openPanel('settings');
            }
          });
        }
        lastShortcutRef.current = shortcut;
      } catch (err) {
        // Cross-run races (old cleanup vs new effect) can still surface "already registered".
        // Only treat it as success if the plugin confirms we own it; otherwise another app holds the chord.
        if (
          String(err).toLowerCase().includes('already registered') &&
          (await isRegistered(shortcut).catch(() => false))
        ) {
          lastShortcutRef.current = shortcut;
          return;
        }
        console.error('Failed to register settings shortcut:', err);
      }
    };

    // Focus events arrive in rapid bursts (alt-tab); serialize register/unregister so two
    // concurrent registerShortcut calls cannot both pass the isRegistered check.
    let chain: Promise<void> = Promise.resolve();
    const schedule = (op: () => Promise<void>) => {
      chain = chain.then(op).catch((err) => console.warn('Settings shortcut operation failed:', err));
    };

    // Listen for Diablo focus changes to register/unregister hotkey
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    listen<boolean>('diablo-focus-changed', ({ payload: isFocused }) => {
      schedule(isFocused ? registerShortcut : unregisterShortcut);
    })
      .then((off) => {
        if (cancelled) {
          Promise.resolve()
            .then(off)
            .catch((error) => console.warn('Failed to release diablo-focus-changed listener:', error));
        } else {
          unlisten = off;
        }
      })
      .catch((error) => {
        console.error('Failed to listen for diablo-focus-changed event:', error);
      });

    return () => {
      cancelled = true;
      const off = unlisten;
      unlisten = null;
      if (off) {
        Promise.resolve()
          .then(off)
          .catch((error) => console.warn('Failed to release diablo-focus-changed listener:', error));
      }
      // Unregister shortcut on cleanup
      schedule(unregisterShortcut);
    };
  }, [settings?.hotkeyModifierSettings, settings?.hotkeyKeySettings, openPanel]);

  useEffect(() => {
    if (!isTauri()) {
      // Tray not available in browser
      return;
    }

    let isMounted = true;

    async function setupTray() {
      if (!isMounted) return;
      try {
        await TrayIcon.removeById(TRAY_ID).catch(() => {});
        const menu = await Menu.new({
          items: [
            {
              id: 'settings',
              text: 'Settings',
              action: () => {
                openPanel('settings');
              },
            },
            {
              id: 'open-config',
              text: 'Open config location',
              action: async () => {
                let configPath: string | undefined;
                try {
                  configPath = await appConfigDir();
                  await openPath(configPath);
                } catch (err) {
                  // Fixed message so every user's home path groups into one Sentry issue.
                  Sentry.captureException(new Error('Failed to open config location'), {
                    extra: { path: configPath, cause: String(err) },
                  });
                }
              },
            },
            {
              id: 'quit',
              text: 'Quit',
              action: () => {
                exit();
              },
            },
          ],
        });

        const instance = await TrayIcon.new({
          id: TRAY_ID,
          icon: await defaultWindowIcon(),
          menu,
          action: (event: TrayIconEvent) => {
            switch (event.type) {
              case 'Click':
                break;
              case 'DoubleClick':
                break;
              case 'Enter':
                break;
              case 'Move':
                break;
              case 'Leave':
                break;
            }
          },
        });

        if (isMounted) {
          trayRef.current = instance;
          setTray(instance);
        }
      } catch (err) {
        console.error('Failed to create tray icon:', err);
      }
    }

    queueTray(setupTray);

    return () => {
      isMounted = false;
      trayRef.current = null;
      queueTray(() => TrayIcon.removeById(TRAY_ID));
    };
    // openPanel is stable: the tray is created once.
  }, [openPanel]);

  return <TrayContext.Provider value={{ tray }}>{children}</TrayContext.Provider>;
};
