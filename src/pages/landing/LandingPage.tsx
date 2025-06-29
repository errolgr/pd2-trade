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
import { relaunch } from '@tauri-apps/plugin-process';
import { ItemLocation } from '@/common/types/Location';


const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Safe encoding function that handles Unicode characters
const safeEncode = (str: string): string => {
  return btoa(encodeURIComponent(str));
};

const LandingPage: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<WebviewWindow | null>(null);
  const { read, copy } = useClipboard();
  const {checkForUpdates, downloadUpdate} = useUpdater();
  const keyPress = useKeySender();
  const { settings, isLoading, updateSettings } = useOptions();
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

  // Periodically check for updates every 5 minutes
  useEffect(() => {
    if (!isTauri()) return;
    let updateNotified = false;

    const checkAndNotify = async () => {
      const update = await checkForUpdates();
      if (update?.available && !updateNotified) {
        updateNotified = true;
        toast("PD2 Trader - Update Available", {
          description: "A new update is ready. Please restart to apply it.",
          position: 'bottom-right',
        });
      }
    };

    // Initial check
    checkAndNotify();
    // Set interval for subsequent checks
    const interval = setInterval(checkAndNotify, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdates]);


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
    const encoded = encodeURIComponent(safeEncode(raw));

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
      winRef.current.emit("new-search", encoded);
      await sleep(100);
      await winRef.current.show();
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

    if (!isStashItem(raw)){
      console.log('[LandingPage] Clipboard does not contain stash item, returning');
      toast("PD2 Trader", { description: "Item must be located in stash in order to list", position: 'bottom-right'})
      return;
    }

    console.log('[LandingPage] Raw Item' + raw);

    const encodedItem = safeEncode(raw);
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
      quickListWinRef.current.emit('quick-list-new-item', encodedItem);
      await sleep(100);
      await quickListWinRef.current.show();
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
  }, [
    isLoading, 
    settings.hotkeyModifier,
    settings.hotkeyKey,
    settings.hotkeyKeyListItem,
    settings.hotkeyModifierListItem
    ]);

  // Listen for Tauri 'toast-event' and show a toast
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      listen('toast-event', (event) => {
        // event.payload can be string or object
        if (typeof event.payload === 'string') {
          toast("PD2 Trader", { description: event.payload, position: 'bottom-right' });
        } else if (event.payload && typeof event.payload === 'object') {
          toast("PD2 Trader", { position: 'bottom-right', ...event.payload });
        }
      }).then((off) => {
        unlisten = off;
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, []);


    // Listen for Tauri 'pd2-token-found' and save the token
    useEffect(() => {
      let unlisten: (() => void) | undefined;
      if (isTauri()) {
        listen<string>('pd2-token-found', (event) => {
          updateSettings({ pd2Token: event.payload });
          toast.success("PD2 Trader", { description: "Authentication successful!", position: 'bottom-right' });
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
      toast.error("PD2 Trader", { description: "PD2 website authentication required!", position: 'bottom-right' });
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
    <Toaster expand
      position="bottom-right" />
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

function isStashItem(jsonString: string): boolean {
  const item = JSON.parse(jsonString);

  return item.location === ItemLocation.STASH;
}
export default LandingPage;
