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

const SHORTCUT = "Control+G";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LandingPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const winRef = useRef<WebviewWindow | null>(null);
  const { read, copy } = useClipboard();
  const {checkForUpdates, downloadUpdate} = useUpdater();

  const lastClipboard = useRef<string | null>(null); // <--- Added ref


  useEffect(() => {
    if (isTauri()) {
     /* checkForUpdates().then((update) => {
        if (update?.available) {
          downloadUpdate(update);
        }
      })*/
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
      console.log("[Shortcut] Clipboard is same as last → toggling window off");
      if (winRef.current) {
        winRef.current.close();
        winRef.current = null;
        setIsOpen(false);
      }
      return;
    }

    lastClipboard.current = raw; // <-- update last clipboard value
    console.log("[Shortcut] Clipboard raw text:", raw);

    const encoded = encodeURIComponent(btoa(raw));
    console.log("[Shortcut] Base64-encoded payload:", encoded);

    if (!winRef.current) {
      console.log("[Shortcut] No item window yet → opening");
      openWindowOverDiablo(encoded);
    } else {
      console.log("[Shortcut] Item window exists → emitting new-search");
      winRef.current.emit("new-search", encoded);
    }
  };

  /* ---------------------------------
   * Open the centered window once
   * --------------------------------- */
  const openWindow = async (encoded: string) => {
    const monitor = await currentMonitor();
    console.log("[Window] Active monitor size:", monitor.size);
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
    console.log("[Window] Item window created, label = 'Item'");

    w.onCloseRequested(() => {
      console.log("[Window] Item window closing");
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

    console.log('RECT:' + JSON.stringify(rect));

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

    console.log('RECT height' + rect.height + ' y: ' + y);


    winRef.current = w;
    setIsOpen(true);
    console.log("[Window] Item window created, label = 'Item'");

    w.onCloseRequested(() => {
      console.log("[Window] Item window closing");
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
    console.log("[LandingPage] Running in Tauri, registering shortcut");

    listen<string>('key-pressed', (event) => {
      if (event.payload === 'ControlLeft+C') {
        fireSearch();
      }
    })
    return () => {
      unregister(SHORTCUT).catch(() => void 0);
      console.log("[LandingPage] Shortcut unregistered on cleanup");
    };
  }, []);

  return <OptionsProvider>
    <OptionsDialog/>
    <TrayProvider/>
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
