import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from "@tauri-apps/api/menu";
import { exit } from '@tauri-apps/plugin-process';
import {useOptions} from "@/hooks/useOptions";
import {currentMonitor, cursorPosition} from "@tauri-apps/api/window";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";
import {attachWindowLifecycle, openCenteredWindow} from "@/lib/window";

type TrayContextValue = {
  tray: TrayIcon | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<TrayIcon | null>(null);
  const { setIsOpen } = useOptions();
  const trayRef = useRef<TrayIcon | null>(null);

  const openWindow = async () => {
    const win = await openCenteredWindow("Settings", "/settings", {
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      focus: true,
      shadow: false,
      width: 1025,
      height: 650,
    })

  };


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
