import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useOptions } from '@/hooks/useOptions';
import { openCenteredWindow, attachWindowCloseHandler } from '@/lib/window';
import { listen } from '@/lib/browser-events';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { appConfigDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import { exit } from '@tauri-apps/plugin-process';
import { WindowTitles } from '@/lib/window-titles';

type TrayContextValue = {
  tray: any | null;
  settingsWindow: any | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null, settingsWindow: null });

export const useTray = () => useContext(TrayContext);

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<any | null>(null);
  const [settingsWindow, setSettingsWindow] = useState<any | null>(null);
  const { settings } = useOptions();
  const trayRef = useRef<any | null>(null);
  const lastShortcutRef = useRef<string | null>(null);
  const settingsWinRef = useRef<any | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isSettingsOpenRef = useRef(isSettingsOpen);

  // Keep ref in sync with state
  useEffect(() => {
    isSettingsOpenRef.current = isSettingsOpen;
  }, [isSettingsOpen]);

  const showSettingsWindow = async () => {
    if (!settingsWinRef.current) {
      settingsWinRef.current = await openCenteredWindow('Settings', '/settings', {
        title: WindowTitles.Settings,
        decorations: false,
        skipTaskbar: true,
        transparent: true,
        alwaysOnTop: true,
        focus: true,
        shadow: false,
        width: 1025,
        height: 700,
      });
      setSettingsWindow(settingsWinRef.current);
      setIsSettingsOpen(true);
      attachWindowCloseHandler(settingsWinRef.current, () => {
        settingsWinRef.current = null;
        setSettingsWindow(null);
        setIsSettingsOpen(false);
      });
    } else {
      await settingsWinRef.current.show();
      setIsSettingsOpen(true);
    }
  };

  // Listen for open-settings event
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen('open-settings', () => {
      showSettingsWindow();
    })
      .then((off) => {
        unlisten = off;
      })
      .catch((err) => {
        console.error('Failed to listen for open-settings event:', err);
      });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

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
              showSettingsWindow();
            }
          });
          lastShortcutRef.current = shortcut;
        }
      } catch (err) {
        console.error('Failed to register settings shortcut:', err);
      }
    };

    // Listen for Diablo focus changes to register/unregister hotkey
    let unlisten: (() => void) | null = null;

    listen<boolean>('diablo-focus-changed', async ({ payload: isFocused }) => {
      if (isFocused) {
        // Diablo gained focus - register hotkey
        await registerShortcut();
      } else {
        // Diablo lost focus - unregister hotkey
        await unregisterShortcut();
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
      // Unregister shortcut on cleanup
      if (isTauri() && lastShortcutRef.current) {
        unregisterShortcut().catch(console.error);
      }
    };
  }, [settings?.hotkeyModifierSettings, settings?.hotkeyKeySettings]);

  useEffect(() => {
    if (!isTauri()) {
      // Tray not available in browser
      return;
    }

    let isMounted = true;

    async function setupTray() {
      try {
        const menu = await Menu.new({
          items: [
            {
              id: 'settings',
              text: 'Settings',
              action: () => {
                showSettingsWindow();
              },
            },
            {
              id: 'open-config',
              text: 'Open config location',
              action: async () => {
                try {
                  const configPath = await appConfigDir();
                  await openPath(configPath);
                } catch (err) {
                  console.error('Failed to open config location:', err);
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

    setupTray();

    return () => {
      isMounted = false;
      // Tauri doesn't expose explicit tray destruction yet
    };
  }, []);

  return <TrayContext.Provider value={{ tray, settingsWindow }}>{children}</TrayContext.Provider>;
};
