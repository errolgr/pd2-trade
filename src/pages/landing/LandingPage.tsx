import React, {useCallback, useEffect, useRef, useState} from 'react';
import {invoke, isTauri} from "@tauri-apps/api/core";
import {
  register,
  unregister,
} from "@tauri-apps/plugin-global-shortcut";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useClipboard } from "@/hooks/useClipboard";
import {TrayProvider} from "@/hooks/useTray";
import {OptionsProvider, useOptions} from "@/hooks/useOptions";
import {useUpdater} from "@/hooks/useUpdater";
import iconPath from '@/assets/img_1.png';
import {useKeySender} from "@/hooks/useKeySender";
import {DialogProvider} from "@/hooks/useDialog";
import {getVersion} from "@tauri-apps/api/app";
import {attachWindowLifecycle, openCenteredWindow, openOverDiabloWindow, openWindowAtCursor} from "@/lib/window";
import {changeLog} from "@/assets/changeLog";
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';


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
  const lastRegisteredShortcut = useRef<string | null>(null);


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
  const fireSearch = useCallback(async () => {
    const focused = await invoke<boolean>('is_diablo_focused');

    if (!focused) {
      console.warn("[LandingPage] Diablo is not focused, skipping search.");
      return;
    }

    if (!(settings.hotkeyModifier === 'ctrl' && settings.hotkeyKey === 'c')) {
      await keyPress('ctrl+c');
    }
    await sleep(100);
    const raw = await read();
    if (!clipboardContainsValidItem(raw)) return;

    if (lastClipboard.current === raw) {
      if (winRef.current) {
        winRef.current.close();
        winRef.current = null;
        setIsOpen(false);
      }
      return;
    }

    lastClipboard.current = raw;
    const encoded = encodeURIComponent(btoa(raw));

    if (!winRef.current) {
      openWindowOverDiablo(encoded);
    } else {
      winRef.current.emit("new-search", encoded);
    }
  }, []);

  const openWindowOverDiablo = async (encoded: string) => {
    const w = await openOverDiabloWindow('Item', `/item?text=${encoded}`, {
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

  // Add handler to open the quick list item shortcut page in a webview
  const openQuickListWindow = async () => {
    console.log('[LandingPage] Opening quick list window...');

    await keyPress('ctrl+c');
    console.log('[LandingPage] Sent ctrl+c to copy item');

    await sleep(100);
    const raw = await read();
    console.log('[LandingPage] Read clipboard content:', raw ? 'valid content' : 'empty');
    
    if (!clipboardContainsValidItem(raw)) {
      console.log('[LandingPage] Clipboard does not contain valid item, returning');
      return;
    }
    console.log('[LandingPage] Raw Item' + raw);;

    const encodedItem = btoa(raw);
    console.log('[LandingPage] Encoded item for URL parameter');
    
    console.log('[LandingPage] Opening centered window with dimensions 600x485');
    await openWindowAtCursor('QuickList', `/quick-list?item=${encodedItem}`, {
      decorations: false,
      transparent: true,
      focus: true,
      shadow: false,
      skipTaskbar: true,
      width: 600,
      height: 485,
      alwaysOnTop: true,
    });
    console.log('[LandingPage] Quick list window opened successfully');
  };

  useEffect(() => {
    if (!isLoading) {
      getVersion().then((version) => {
        console.log("[LandingPage] Current version:", version);
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
    if (!isTauri() || isLoading || !settings.hotkeyKey) return;

    const newShortcut = `${settings.hotkeyModifier === 'ctrl' ? 'Control' : 'Alt'}+${settings.hotkeyKey.toUpperCase()}`;
    const quickListShortcut =  `${settings.hotkeyModifierListItem === 'ctrl' ? 'Control' : 'Alt'}+${settings.hotkeyKeyListItem.toUpperCase()}`;

    const cleanup = async () => {
      if (lastRegisteredShortcut.current) {
        console.log('[LandingPage] Unregistering previous shortcut:', lastRegisteredShortcut.current);
        try {
          await unregister(lastRegisteredShortcut.current);
        } catch {
          // ignore
        }
      }

      console.log('[LandingPage] Registering shortcut:', newShortcut);
      await register(newShortcut, (e) => {
        if (e.state === 'Pressed') {
          fireSearch();
          console.log('[LandingPage] Shortcut pressed:', newShortcut);
        }
      });

      lastRegisteredShortcut.current = newShortcut;

      // Register the quick-list shortcut
      await register(quickListShortcut, (e) => {
        if (e.state === 'Pressed') {
          openQuickListWindow();
          console.log('[LandingPage] Quick List shortcut pressed:', quickListShortcut);
        }
      });
    };

    cleanup();

    return () => {
      if (lastRegisteredShortcut.current) {
        unregister(lastRegisteredShortcut.current).catch(() => void 0);
        console.log('[LandingPage] Cleanup: unregistered shortcut:', lastRegisteredShortcut.current);
        lastRegisteredShortcut.current = null;
      }
      // Unregister the quick-list shortcut
      unregister(quickListShortcut).catch(() => void 0);
      console.log('[LandingPage] Cleanup: unregistered quick-list shortcut:', quickListShortcut);
    };
  }, [isLoading, settings.hotkeyModifier, settings.hotkeyKey]);
  return <Pd2WebsiteProvider>
    {showTitle && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <img src={iconPath}
          style={{width: 400}}/>
      </div>
    )}
  </Pd2WebsiteProvider>
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
