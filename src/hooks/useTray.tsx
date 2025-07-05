import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from "@tauri-apps/api/menu";
import { exit } from '@tauri-apps/plugin-process';
import {useOptions} from "@/hooks/useOptions";
import {openCenteredWindow, attachWindowCloseHandler} from "@/lib/window";
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { openPath } from '@tauri-apps/plugin-opener';
import { appConfigDir } from '@tauri-apps/api/path';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

type TrayContextValue = {
  tray: TrayIcon | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<TrayIcon | null>(null);
  const { setIsOpen, settings } = useOptions();
  const trayRef = useRef<TrayIcon | null>(null);
  const lastShortcutRef = useRef<string | null>(null);
  const settingsWinRef = useRef<WebviewWindow | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openWindow = async () => {
    if (settingsWinRef.current && isSettingsOpen) {
      await settingsWinRef.current.hide();
      setIsSettingsOpen(false);
      return;
    }

    if (!settingsWinRef.current) {
      settingsWinRef.current = await openCenteredWindow("Settings", "/settings", {
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        focus: true,
        center: true,
        shadow: false,
        width: 1025,
        height: 650,
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

  // Register global shortcut for opening settings
  useEffect(() => {
    if (!settings?.hotkeyModifierSettings || !settings?.hotkeyKeySettings) return;

    const shortcut = `${settings.hotkeyModifierSettings}+${settings.hotkeyKeySettings}`.toLowerCase();

    async function registerShortcut() {
      try {
        if (lastShortcutRef.current) {
          await unregister(lastShortcutRef.current);
        }
        await register(shortcut, () => {
          openWindow();
        });
        lastShortcutRef.current = shortcut;
      } catch (err) {
        console.error('Failed to register settings shortcut:', err);
      }
    }

    registerShortcut();

    return () => {
      if (lastShortcutRef.current) {
        unregister(lastShortcutRef.current);
        lastShortcutRef.current = null;
      }
    };
  }, [settings?.hotkeyModifierSettings, settings?.hotkeyKeySettings]);

  useEffect(() => {
    let isMounted = true;

    async function setupTray() {
      try {
        const menu = await Menu.new({
          items: [
            {
              id: 'settings',
              text: 'Settings',
              action: () => {
                openWindow();
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
