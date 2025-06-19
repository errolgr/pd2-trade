import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from "@tauri-apps/api/menu";
import { exit } from '@tauri-apps/plugin-process';
import {useOptions} from "@/hooks/useOptions";
import {currentMonitor, cursorPosition} from "@tauri-apps/api/window";
import {WebviewWindow} from "@tauri-apps/api/webviewWindow";

type TrayContextValue = {
  tray: TrayIcon | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<TrayIcon | null>(null);
  const { setIsOpen } = useOptions();
  const trayRef = useRef<TrayIcon | null>(null);
  const winRef = useRef<WebviewWindow | null>(null);


  const openWindow = async () => {
    const monitor = await currentMonitor();
    const width = 800.0;
    const height = 650;

    const w = new WebviewWindow("Item", {
      url: `/settings`,
      x: monitor.position.x + (monitor.size.width - width) / 2,
      y: monitor.position.y + (monitor.size.height - height) / 2,
      width,
      height,
      shadow: false,
      focus: true,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
    });

    winRef.current = w;
    setIsOpen(true);

    w.onCloseRequested(() => {
      winRef.current = null;
      setIsOpen(false);
    });

    w.onFocusChanged((event) => {
      if (!event.payload) {
        winRef.current.close();
        winRef.current = null;
        setIsOpen(false);
      }
    });
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
