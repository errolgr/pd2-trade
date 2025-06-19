import React, { useEffect, useRef, useState } from 'react';
import {invoke, isTauri} from "@tauri-apps/api/core";
import {
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import { currentMonitor, cursorPosition } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useClipboard } from "@/hooks/useClipboard";
import {listen} from "@tauri-apps/api/event";
import {TrayProvider} from "@/hooks/useTray";
import {OptionsDialog, OptionsProvider} from "@/hooks/useOptions";
import {useUpdater} from "@/hooks/useUpdater";
import iconPath from '@/assets/img_1.png';
const SHORTCUT = "Control+G";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LandingPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<WebviewWindow | null>(null);
  const { read, copy } = useClipboard();
  const {checkForUpdates, downloadUpdate} = useUpdater();

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

  /* ---------------------------------
   * Open the centered window once
   * --------------------------------- */
  const openWindow = async (encoded: string) => {
    const monitor = await currentMonitor();
    const { x, y } = await cursorPosition();
    const w = new WebviewWindow("Item", {
      url: `/item?text=${encoded}`,
      x,
      y,
      width: 600  ,
      height: 600,
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
      lastClipboard.current = null;
    });

    w.onFocusChanged((event) => {
      if (!event.payload) {
        winRef.current.close();
        winRef.current = null;
        setIsOpen(false);
      }
    });
  };

  const openWindowOverDiablo = async (encoded: string) => {
    const { x } = await cursorPosition();
    const rect = await invoke<{
      x: number; y: number; width: number; height: number;
    }>("get_diablo_rect");

    if (!rect) {
      return openWindow(encoded);
    }

    const W = 500;
    // 2) compute center of that rect
    const y = rect.y;

    // 3) spawn your Webview there
    const w = new WebviewWindow("Item", {
      url: `/item?text=${encoded}`,
      x: x - W,
      y,
      width: W,
      minHeight: 1080,
      height: rect.height,
      shadow: false,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      focus: true,
    });


    winRef.current = w;
    setIsOpen(true);
    w.onCloseRequested(() => {
      winRef.current = null;
      setIsOpen(false);
      lastClipboard.current = null;
    });

    w.onFocusChanged((event) => {
      if (!event.payload) {
         winRef.current.close();
         winRef.current = null;
         setIsOpen(false);
       }
    });
  };


  /* ---------------------------------
   * One-time setup
   * --------------------------------- */
  useEffect(() => {
    if (!isTauri()) {
      console.warn("[LandingPage] Not in a Tauri environment – shortcut skipped");
      return;
    }

    listen<string>('key-pressed', (event) => {
      if (event.payload === 'ControlLeft+C') {
        fireSearch();
      }
    })
    return () => {
      unregister(SHORTCUT).catch(() => void 0);
    };
  }, []);

  return <OptionsProvider>
    <TrayProvider/>
    {showTitle && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <img src={iconPath} style={{width: 400}}/>
      </div>
    )}
  </OptionsProvider>; // this launcher has no visible UI
};

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
