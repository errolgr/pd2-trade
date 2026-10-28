import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import { useOverlay } from '@/overlay';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { hotkeyKeyToken } from '@/lib/hotkey-keys';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import * as Sentry from '@sentry/react';
import { exit } from '@tauri-apps/plugin-process';

type TrayContextValue = {
  tray: any | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

/** Rust → Main: the app was launched again while it runs (src-tauri lib.rs, single-instance). */
export const APP_RELAUNCHED_EVENT = 'app-relaunched';

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
    const key = hotkeyKeyToken(settings?.hotkeyKeySettings);
    // A key the parser cannot take is flagged in the settings window; register nothing for it
    if (!isTauri() || !settings?.hotkeyModifierSettings || !key) return;

    const shortcut = `${settings.hotkeyModifierSettings}+${key}`.toLowerCase();

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
        if (String(err).toLowerCase().includes('already registered')) {
          if (await isRegistered(shortcut).catch(() => false)) {
            lastShortcutRef.current = shortcut;
            return;
          }
          // Another app holds the chord: the user's setup (pick a different hotkey), not an app bug
          console.warn('Settings shortcut is held by another app:', err);
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
    const releaseFocusListener = holdListener(
      listen<boolean>('diablo-focus-changed', ({ payload: isFocused }) => {
        schedule(isFocused ? registerShortcut : unregisterShortcut);
      }),
      'diablo-focus-changed',
    );

    return () => {
      releaseFocusListener();
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
                try {
                  await invoke('open_config_dir');
                } catch (err) {
                  // Fixed message so every user's home path groups into one Sentry issue.
                  Sentry.captureException(new Error('Failed to open config location'), {
                    extra: { cause: String(err) },
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

  // Launching the app again while it runs shows Settings, like the tray's Settings item: the new launch exits, and
  // nothing else of this one may be on screen
  useEffect(
    () =>
      holdListener(
        listen(APP_RELAUNCHED_EVENT, () => openPanel('settings')),
        APP_RELAUNCHED_EVENT,
      ),
    [openPanel],
  );

  return <TrayContext.Provider value={{ tray }}>{children}</TrayContext.Provider>;
};
