import { useCallback, useEffect } from 'react';
import { emit, listen } from '@/lib/browser-events';
import { openCenteredWindow, openOverDiabloWindow, openWindowAtCursor, openWindowCenteredOnDiablo } from '@/lib/window';
import { WindowTitles, WindowLabels } from '@/lib/window-titles';
import { useKeySender } from '@/hooks/useKeySender';
import { useClipboard } from '@/hooks/useClipboard';
import { clipboardContainsValidItem, isStashItem, encodeItem, encodeItemForQuickList, sleep } from '@/lib/item-utils';
import { GenericToastPayload } from '@/common/types/Events';
import { Item } from '@/pages/price-check/lib/interfaces';
import { WindowRefs } from './useWindowRefs';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { attachRefClearOnClose } from '@/lib/window-helpers';

interface UseItemActionsProps {
  windowRefs: WindowRefs;
  checkDiabloFocus: () => Promise<boolean>;
  settings: any;
}

export const useItemActions = ({ windowRefs, checkDiabloFocus, settings }: UseItemActionsProps) => {
  const { winRef, quickListWinRef, currencyWindowRef } = windowRefs;
  const { read } = useClipboard();
  const keyPress = useKeySender();

  // Copy item from clipboard and validate
  const copyAndValidateItem = useCallback(async (): Promise<string | null> => {
    await keyPress('ctrl+c');
    await sleep(250);
    const raw = await read();
    return clipboardContainsValidItem(raw) ? raw : null;
  }, [read, keyPress]);

  // Open item search window
  const fireSearch = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    if (!(settings.hotkeyModifier === 'ctrl' && settings.hotkeyKey === 'c')) {
      await keyPress('ctrl+c');
    }
    await sleep(250);
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
      winRef.current = await openOverDiabloWindow(WindowLabels.ItemSearch, `/item?text=${encoded}`, {
        title: WindowTitles.ItemSearch,
        decorations: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        shadow: false,
        focus: false,
        focusable: true,
      });
      attachRefClearOnClose(winRef.current, winRef);
    } else {
      await winRef.current.emit('new-search', encoded);
      await sleep(100);
      await winRef.current.show();
    }
  }, [checkDiabloFocus, read, keyPress, settings, winRef]);

  // Open currency valuation window
  const openCurrencyValuation = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;

    if (!currencyWindowRef.current) {
      currencyWindowRef.current = await openCenteredWindow(WindowLabels.Currency, '/currency', {
        title: WindowTitles.Currency,
        decorations: false,
        focus: true,
        shadow: false,
        skipTaskbar: true,
        width: 665,
        height: 870,
        alwaysOnTop: true,
      });

      attachRefClearOnClose(currencyWindowRef.current, currencyWindowRef);
    } else {
      try {
        await currencyWindowRef.current.show();
        await currencyWindowRef.current.setFocus();
      } catch (err) {
        console.error('[LandingPage] Failed to focus existing currency window:', err);
        currencyWindowRef.current = null;
      }
    }
  }, [checkDiabloFocus, currencyWindowRef]);

  // Open quick list window
  const openQuickListWindow = useCallback(
    async (_item: Item | null) => {
      if (!(await checkDiabloFocus())) return;

      const raw = await copyAndValidateItem();
      let encodedItem = '';
      let queryString = '';

      let errorToastPayload: GenericToastPayload | null = null;

      if (raw) {
        if (isStashItem(raw)) {
          encodedItem = encodeItemForQuickList(raw);
          queryString = `?item=${encodedItem}`;
        } else {
          // Valid item but not in stash
          queryString = `?error=not_shared_stash`;
          errorToastPayload = {
            title: 'Cannot List Item',
            description: 'This item is not in your shared stash and cannot be listed.',
            variant: 'error',
          };
        }
      } else {
        // Invalid or missing item
        queryString = `?error=not_shared_stash`;
        errorToastPayload = {
          title: 'Cannot List Item',
          description: 'Item is not supported or invalid.',
          variant: 'error',
        };
      }

      if (!quickListWinRef.current) {
        quickListWinRef.current = await openWindowAtCursor(WindowLabels.QuickList, `/quick-list${queryString}`, {
          title: WindowTitles.QuickList,
          decorations: false,
          transparent: true,
          focus: false,
          shadow: false,
          skipTaskbar: true,
          focusable: true,
          width: 600,
          height: 512,
          resizable: true,
          alwaysOnTop: true,
        });

        if (quickListWinRef.current) {
          // Attach closer but log differently as originally intended?
          // Original: console.log('[QuickList] Window closed (onCloseRequested), clearing ref.');
          // The generic helper doesn't log, but the effect is the same.
          attachRefClearOnClose(quickListWinRef.current, quickListWinRef);
        } else {
          console.error('[QuickList] openWindowAtCursor returned null!');
        }
      } else {
        console.log('[QuickList] Window already exists, showing and focusing.');
        try {
          await quickListWinRef.current.show();
          await quickListWinRef.current.setFocus();
          if (encodedItem) {
            await quickListWinRef.current.emit('quick-list-new-item', encodedItem);
          } else if (queryString.includes('error=')) {
            // Clear item state in window
            await quickListWinRef.current.emit('quick-list-error', 'not_shared_stash');
          }
        } catch {
          quickListWinRef.current = null;
        }
      }

      // Emit toast at the end to ensure it appears atop the window and isn't duplicated
      if (errorToastPayload) {
        await emit('toast-event', errorToastPayload);
      }
    },
    [checkDiabloFocus, copyAndValidateItem, quickListWinRef],
  );

  // Listen for request to open Quick List (Manage View) from Chat Button
  useEffect(() => {
    let unlistenManage: (() => void) | null = null;
    let unlistenCurrency: (() => void) | null = null;
    let unlistenQuickList: (() => void) | null = null;

    const setupListeners = async () => {
      // 1. Manage Quick List
      unlistenManage = await listen<void>('open-quick-list-manage', async () => {
        if (!(await checkDiabloFocus())) return;
        const label = WindowLabels.QuickList;
        // 1. Check existing ref
        if (quickListWinRef.current) {
          try {
            await quickListWinRef.current.show();
            await quickListWinRef.current.setFocus();
            return;
          } catch {
            quickListWinRef.current = null;
          }
        }
        // 2. Check by label
        const existing = await WebviewWindow.getByLabel(label);
        if (existing) {
          try {
            await existing.show();
            await existing.setFocus();
            quickListWinRef.current = existing;
            attachRefClearOnClose(existing, quickListWinRef);
            return;
          } catch (e) {
            console.warn('Found zombie window by label, ignoring:', e);
          }
        }
        // 3. Create new
        quickListWinRef.current = await openWindowCenteredOnDiablo(label, '/quick-list', {
          title: WindowTitles.QuickList,
          decorations: false,
          transparent: true,
          focus: false,
          shadow: false,
          skipTaskbar: true,
          focusable: true,
          width: 600,
          height: 512,
          resizable: true,
          alwaysOnTop: true,
          visible: true,
        });
        if (quickListWinRef.current) {
          await quickListWinRef.current.show();
          attachRefClearOnClose(quickListWinRef.current, quickListWinRef);
        }
      });

      // 2. Open Currency
      unlistenCurrency = await listen<void>('open-currency-valuation', async () => {
        await openCurrencyValuation();
      });

      // 3. Open Quick List For Item
      unlistenQuickList = await listen<Item>('open-quick-list-for-item', async (event) => {
        await openQuickListWindow(event.payload);
      });
    };

    setupListeners();

    return () => {
      if (unlistenManage) unlistenManage();
      if (unlistenCurrency) unlistenCurrency();
      if (unlistenQuickList) unlistenQuickList();
    };
  }, [checkDiabloFocus, quickListWinRef, openCurrencyValuation, openQuickListWindow]);

  return { fireSearch, openCurrencyValuation, openQuickListWindow };
};
