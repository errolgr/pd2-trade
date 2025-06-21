import React, { useEffect, useRef, useState } from 'react';
import {invoke, isTauri} from "@tauri-apps/api/core";
import {
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useClipboard } from "@/hooks/useClipboard";
import {listen} from "@tauri-apps/api/event";
import {TrayProvider} from "@/hooks/useTray";
import {OptionsProvider, useOptions} from "@/hooks/useOptions";
import {useUpdater} from "@/hooks/useUpdater";
import iconPath from '@/assets/img_1.png';
import {useKeySender} from "@/hooks/useKeySender";
import {DialogProvider} from "@/hooks/useDialog";
import {getVersion} from "@tauri-apps/api/app";
import {attachWindowLifecycle, openCenteredWindow, openOverDiabloWindow} from "@/lib/window";
import {changeLog} from "@/assets/changeLog";
const SHORTCUT = "Control+G";


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LandingPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<WebviewWindow | null>(null);
  const { read, copy } = useClipboard();
  const {checkForUpdates, downloadUpdate} = useUpdater();
  const keyPress = useKeySender();
  const { settings, isLoading } = useOptions();
  const lastClipboard = useRef<string | null>(null); // <--- Added ref


  // Hide the launch title after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTitle(false), 2000);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (isTauri()) {
      checkForUpdates().then((update) => {
        if (update?.available) {
          downloadUpdate(update);
        }
      })
    }
  }, [])

  /* ---------------------------------
   * Fire when the shortcut is pressed
   * --------------------------------- */
  const fireSearch = async () => {
    await keyPress('ctrl+c')
    await sleep(200);

    const raw = await read();

    if (!clipboardContainsValidItem(raw)) return;

    // If the clipboard content is unchanged → close the window
    if (lastClipboard.current === raw) {
      if (winRef.current) {
        winRef.current.close();
        winRef.current = null;
        setIsOpen(false);
      }
      return;
    }

    lastClipboard.current = raw; // <-- update last clipboard value

    const encoded = encodeURIComponent(btoa(raw));

    if (!winRef.current) {
      openWindowOverDiablo(encoded);
    } else {
      winRef.current.emit("new-search", encoded);
    }
  };

  const openWindowOverDiablo = async (encoded: string) => {
    const w = await openOverDiabloWindow('Settings', `/item?text=${encoded}`, {
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      shadow: false,
    });

    if (!w) return;

    winRef.current = w;
    setIsOpen(true);

    attachWindowLifecycle(w, () => {
      winRef.current = null;
      setIsOpen(false);
      lastClipboard.current = null;
    });
  };



  useEffect(() => {
    if (!isLoading) {
      getVersion().then((version) => {
        console.log("[LandingPage] Current version:", version);
        console.log("[LandingPage] settings.lastSeenVersion", settings);
        if (version && settings.lastSeenVersion != version && changeLog[version]) {
          openCenteredWindow('ChangeLog', '/change-log', {
            decorations: false,
            transparent: true,
            focus: true,
            shadow: false,
            skipTaskbar: true,
            }
          );
        }
      });
    }
  }, [settings]);

  /* ---------------------------------
   * One-time setup
   * --------------------------------- */
  useEffect(() => {
    if (!isTauri()) {
      console.warn("[LandingPage] Not in a Tauri environment – shortcut skipped");
      return;
    }

    listen<string>('key-pressed', (event) => {
      if (event.payload === `${settings.hotkeyModifier}+${settings.hotkeyKey}`) {
        fireSearch();
      }
    })
    return () => {
      unregister(SHORTCUT).catch(() => void 0);
    };
  }, [settings]);

  return <>
    {showTitle && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <img src={iconPath}
          style={{width: 400}}/>
      </div>
    )}
  </>
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DialogProvider>
      <OptionsProvider>
        <TrayProvider>
          {children}
        </TrayProvider>
      </OptionsProvider>
    </DialogProvider>
  );
}

function clipboardContainsValidItem(jsonString: string): boolean {
  try {
    const item = JSON.parse(jsonString)

    if (typeof item !== 'object' || item === null) return false

    const hasRequiredFields =
      typeof item.quality === 'string' &&
      typeof item.type === 'string' &&
      typeof item.iLevel === 'number' &&
      Array.isArray(item.stats)

    return hasRequiredFields
  } catch {
    return false
  }
}
export default LandingPage;
