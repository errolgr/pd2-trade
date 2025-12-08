import React, { useCallback, useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';
import { useClipboard } from '@/hooks/useClipboard';
import { TrayProvider } from '@/hooks/useTray';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { useKeySender } from '@/hooks/useKeySender';
import { DialogProvider } from '@/hooks/useDialog';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { openCenteredWindow, openOverDiabloWindow, openWindowAtCursor, attachWindowCloseHandler } from '@/lib/window';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { usePD2Auth } from '@/hooks/usePD2Auth';
import { useChangelog } from '@/hooks/useChangelog';
import { useWhisperNotifications } from '@/hooks/useWhisperNotifications';
import { clipboardContainsValidItem, isStashItem, encodeItem, encodeItemForQuickList, sleep } from '@/lib/item-utils';
import { GenericToastPayload } from '@/common/types/Events';
import iconPath from '@/assets/img_1.png';
import { ItemsProvider } from '@/hooks/useItems';

const LandingPage: React.FC = () => {
  const [showTitle, setShowTitle] = useState(true);
  const winRef = useRef<WebviewWindow | null>(null);
  const quickListWinRef = useRef<WebviewWindow | null>(null);
  const { read } = useClipboard();
  const keyPress = useKeySender();
  const { settings } = useOptions();

  // Hide launch title after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTitle(false);
      emit('toast-event', 'is now running in the background...');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check if Diablo is focused
  const checkDiabloFocus = useCallback(async (): Promise<boolean> => {
    const focused = await invoke<boolean>('is_diablo_focused');
    if (!focused) {
      console.warn('[LandingPage] Diablo is not focused, skipping action.');
    }
    return focused;
  }, []);

  // Copy item from clipboard and validate
  const copyAndValidateItem = useCallback(async (): Promise<string | null> => {
    await keyPress('ctrl+c');
    await sleep(100);
    const raw = await read();
    return clipboardContainsValidItem(raw) ? raw : null;
  }, [read, keyPress]);

  // Open item search window
  const fireSearch = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    if (!(settings.hotkeyModifier === 'ctrl' && settings.hotkeyKey === 'c')) {
      await keyPress('ctrl+c');
    }
    await sleep(100);
    const raw = await read();
    if (!clipboardContainsValidItem(raw)) {
      const errorToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Item is not supported or invalid.',
        variant: 'error',
      };
      emit('toast-event', errorToastPayload);
      return;
    }

    const encoded = encodeItem(raw);

    if (!winRef.current) {
      winRef.current = await openOverDiabloWindow('Item', `/item?text=${encoded}`, {
        decorations: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        shadow: false,
        focus: false,
        focusable: false,
      });
      attachWindowCloseHandler(winRef.current, () => {
        winRef.current = null;
      });
    } else {
      winRef.current.emit('new-search', encoded);
      await sleep(100);
      await winRef.current.show();
    }
  }, [checkDiabloFocus, read, keyPress, settings]);

  // Open currency valuation window
  const openCurrencyValuation = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    await openCenteredWindow('Currency', '/currency', {
      decorations: false,
      focus: true,
      shadow: false,
      skipTaskbar: true,
      width: 640,
      height: 870,
      alwaysOnTop: true,
    });
  }, [checkDiabloFocus]);

  // Open quick list window
  const openQuickListWindow = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    const raw = await copyAndValidateItem();
    if (!raw) {
      const errorToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Item is not supported or invalid.',
        variant: 'error',
      };
      emit('toast-event', errorToastPayload);
      return;
    }

    if (!isStashItem(raw)) {
      const errorToastPayload: GenericToastPayload = {
        title: 'PD2 Trader',
        description: 'Item must be located in stash in order to list',
        variant: 'error',
      };
      emit('toast-event', errorToastPayload);
      return;
    }

    const encodedItem = encodeItemForQuickList(raw);

    if (!quickListWinRef.current) {
      quickListWinRef.current = await openWindowAtCursor('QuickList', `/quick-list?item=${encodedItem}`, {
        decorations: false,
        transparent: true,
        focus: false,
        shadow: false,
        skipTaskbar: true,
        focusable: false,
        width: 600,
        height: 512,
        resizable: true,
        alwaysOnTop: true,
      });
    } else {
      quickListWinRef.current.emit('quick-list-new-item', encodedItem);
      await sleep(100);
      await quickListWinRef.current.show();
    }
  }, [checkDiabloFocus, copyAndValidateItem]);

  // Register shortcuts
  useAppShortcuts(fireSearch, openQuickListWindow, openCurrencyValuation);

  // Handle updates
  useAppUpdates();

  // Handle authentication
  usePD2Auth();

  // Handle changelog
  useChangelog();

  // Handle whisper notifications
  // Always enable the hook - it handles the logic internally based on settings
  useWhisperNotifications(true);

  // Start/stop chat watcher based on settings (start if either general or trade notifications are enabled)
  useEffect(() => {
    if (!isTauri()) return;

    const generalEnabled = settings.whisperNotificationsEnabled ?? true;
    const tradeEnabled = settings.tradeNotificationsEnabled ?? true;
    const shouldWatch = generalEnabled || tradeEnabled;

    const manageWatcher = async () => {
      try {
        if (shouldWatch) {
          await invoke('start_chat_watcher', { customD2Dir: settings.diablo2Directory });
        } else {
          await invoke('stop_chat_watcher');
        }
      } catch (error) {
        console.error('Failed to manage chat watcher:', error);
      }
    };

    manageWatcher();

    return () => {
      if (isTauri()) {
        invoke('stop_chat_watcher').catch(console.error);
      }
    };
  }, [settings.whisperNotificationsEnabled, settings.tradeNotificationsEnabled, settings.diablo2Directory]);

  return (
    <ItemsProvider>
      <Pd2WebsiteProvider>
        <div>
          {showTitle && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <img src={iconPath} style={{ width: 400 }} alt="PD2 Trader" />
            </div>
          )}
        </div>
      </Pd2WebsiteProvider>
    </ItemsProvider>
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DialogProvider>
      <OptionsProvider>
        <TrayProvider>{children}</TrayProvider>
      </OptionsProvider>
    </DialogProvider>
  );
};

export default LandingPage;
