import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { useOptions } from "@/hooks/useOptions";
import { openCenteredWindow, attachWindowCloseHandler } from "@/lib/window";
import { listen } from '@/lib/browser-events';
import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { appConfigDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import { exit } from '@tauri-apps/plugin-process';

type TrayContextValue = {
  tray: any | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<any | null>(null);
  const { setIsOpen, settings } = useOptions();
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
      settingsWinRef.current = await openCenteredWindow("Settings", "/settings", {
        decorations: false,
        skipTaskbar: true,
        transparent: true,
        alwaysOnTop: true,
        focus: true,
        shadow: false,
        width: 1025,
        height: 700,
      });
      setIsSettingsOpen(true);
      attachWindowCloseHandler(settingsWinRef.current, () => {
        settingsWinRef.current = null;
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
    }).then((off) => {
      unlisten = off;
    }).catch((err) => {
      console.error('Failed to listen for open-settings event:', err);
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Register global shortcut for opening settings
  useEffect(() => {
    if (!isTauri() || !settings?.hotkeyModifierSettings || !settings?.hotkeyKeySettings) return;

    const shortcut = `${settings.hotkeyModifierSettings}+${settings.hotkeyKeySettings}`.toLowerCase();

    async function registerShortcut() {
      try {
        if (lastShortcutRef.current) {
          await unregister(lastShortcutRef.current);
        }
        if (!await isRegistered(shortcut)) {
          await register(shortcut, () => {
            showSettingsWindow();
          });
        }

        lastShortcutRef.current = shortcut;
      } catch (err) {
        console.error('Failed to register settings shortcut:', err);
      }
    }

    registerShortcut();

    return () => {
      if (isTauri() && lastShortcutRef.current) {
        unregister(lastShortcutRef.current).then(() => {
          lastShortcutRef.current = null;
        }).catch(console.error);
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
              }
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
              }
            },
            {
              id: 'quit',
              text: 'Quit',
              action: () => {
                exit();
              }
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

  return (
    <TrayContext.Provider value={{ tray }}>
      {children}
    </TrayContext.Provider>
  );
};
