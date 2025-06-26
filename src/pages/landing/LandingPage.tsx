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
import {openCenteredWindow, openOverDiabloWindow, openWindowAtCursor, attachWindowCloseHandler} from "@/lib/window";
import {changeLog} from "@/assets/changeLog";
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { emit, listen } from '@tauri-apps/api/event';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { jwtDecode } from 'jwt-decode';


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LandingPage: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<WebviewWindow | null>(null);
  const { read, copy } = useClipboard();
  const {checkForUpdates, downloadUpdate} = useUpdater();
  const keyPress = useKeySender();
  const { settings, isLoading } = useOptions();
  const lastRegisteredShortcut = useRef<string | null>(null);
  const quickListWinRef = useRef<WebviewWindow | null>(null);



  // Hide the launch title after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false)
      emit('toast-event', "is now running in the background...")
    }, 2000);
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
    const encoded = encodeURIComponent(btoa(raw));

    if (!winRef.current) {
      winRef.current = await openOverDiabloWindow('Item', `/item?text=${encoded}`, {
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        shadow: false,
        focus: true,
      });

      attachWindowCloseHandler(winRef.current, () => {
        winRef.current = null;
      });
    } else {
      await winRef.current.show();
      winRef.current.emit("new-search", encoded);
    }
  }, []);


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
    console.log('[LandingPage] Raw Item' + raw);

    const encodedItem = btoa(raw);
    console.log('[LandingPage] Encoded item for URL parameter');

    if (!quickListWinRef.current) {
      quickListWinRef.current = await openWindowAtCursor('QuickList', `/quick-list?item=${encodedItem}`, {
        decorations: false,
        transparent: true,
        focus: true,
        shadow: false,
        skipTaskbar: true,
        width: 600,
        height: 485,
        alwaysOnTop: true,
      });
      attachWindowCloseHandler(quickListWinRef.current, () => {
        quickListWinRef.current = null;
      });
    } else {
      await quickListWinRef.current.show();
      quickListWinRef.current.emit('quick-list-new-item', encodedItem);
    }
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

  // Listen for Tauri 'toast-event' and show a toast
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      listen('toast-event', (event) => {
        // event.payload can be string or object
        let message = '';
        if (typeof event.payload === 'string') {
          message = event.payload;
        } else if (event.payload && typeof event.payload === 'object') {
          message = JSON.stringify(event.payload);
        }
        toast("PD2 Trader", { description: message, position: 'bottom-right' });
      }).then((off) => {
        unlisten = off;
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, []);


   // Open webview
   const open = async () => {
    try {
      await invoke('open_project_diablo2_webview');
    } catch (error) {
      console.error('Failed to open Project Diablo 2 webview:', error);
      throw error;
    }
  };

  // Effect to check pd2Token validity and open webview if needed
  useEffect(() => {
    if (isLoading) return; 

    if (!settings?.pd2Token) {
      open();
      return;
    }
    try {
      const payload: { exp?: number } = jwtDecode(settings.pd2Token);
      const exp = payload.exp;
      if (!exp) {
        open();
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const fiveHours = 5 * 60 * 60;
      if (exp < now + fiveHours) {
        open();
      }
    } catch (e) {
      open();
    }
  }, [settings?.pd2Token, isLoading]);

  return <Pd2WebsiteProvider>
    <Toaster position="bottom-right" />
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
