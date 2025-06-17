import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { TrayIcon, TrayIconEvent } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from "@tauri-apps/api/menu";
import { exit } from '@tauri-apps/plugin-process';
import {useOptions} from "@/hooks/useOptions";

type TrayContextValue = {
  tray: TrayIcon | null;
};

const TrayContext = createContext<TrayContextValue>({ tray: null });

export const useTray = () => useContext(TrayContext);

export const TrayProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [tray, setTray] = useState<TrayIcon | null>(null);
  const { setIsOpen } = useOptions();
  const trayRef = useRef<TrayIcon | null>(null);


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
                setIsOpen(true);
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
                console.log(
                  `mouse ${event.button} button pressed, state: ${event.buttonState}`
                );
                break;
              case 'DoubleClick':
                console.log(`mouse ${event.button} button pressed`);
                break;
              case 'Enter':
                console.log(
                  `mouse hovered tray at ${event.rect.position.x}, ${event.rect.position.y}`
                );
                break;
              case 'Move':
                console.log(
                  `mouse moved on tray at ${event.rect.position.x}, ${event.rect.position.y}`
                );
                break;
              case 'Leave':
                console.log(
                  `mouse left tray at ${event.rect.position.x}, ${event.rect.position.y}`
                );
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
