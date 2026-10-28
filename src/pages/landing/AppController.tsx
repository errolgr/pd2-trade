import React, { useCallback, useEffect, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { useClipboard } from '@/hooks/useClipboard';
import { useOptions } from '@/hooks/useOptions';
import { useKeySender } from '@/hooks/useKeySender';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { usePD2Auth } from '@/hooks/usePD2Auth';
import { useChangelog } from '@/hooks/useChangelog';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import { useNetWorth } from '@/hooks/useNetWorth';
import { clipboardContainsValidItem, isStashItem, encodeItem, encodeItemForQuickList, sleep } from '@/lib/item-utils';
import {
  getBadgeCount,
  isKeyboardClaimed,
  releaseKeyboard,
  showToast,
  useOverlay,
  type PanelPayloads,
} from '@/overlay';
import { openOffers } from '@/pages/chat/chat-feed';
import { useDelist } from '@/pages/delist/DelistHandler';
import { useMarketAlerts } from '@/pages/market/alerts/useMarketAlerts';

/** Prefix of the error start_chat_watcher returns when the chat log can't be found or created (chat_watcher.rs). */
const CHAT_LOG_MISSING = 'Could not find or create chat log file';

const UNSUPPORTED_ITEM = 'Item is not supported or invalid.';
/** The clipboard didn't change: no item under the cursor, or the game never got the Ctrl+C (e.g. a Linux desktop
 * that blocks simulated keys). An item the user copied themselves still works. */
const NOTHING_COPIED = 'No item was copied. Hover over an item in game and try again, or press Ctrl+C on it first.';

/**
 * App-wide behaviour that is not a panel: global hotkeys, clipboard item capture, chat watcher, socket
 * notifications, updates/auth/changelog, and the always-on panels (chat button). Renders nothing.
 */
const AppController: React.FC = () => {
  const { read, copy } = useClipboard();
  const keyPress = useKeySender();
  const { settings, isLoading } = useOptions();
  const { openPanel, closePanel, togglePanel } = useOverlay();
  const { delistItem } = useDelist();
  const { takeSnapshot } = useNetWorth();

  // Socket notifications (offers and whispers) - exactly one instance, here
  useSocketNotifications({ settings, whisperNotificationsEnabled: true });

  // Saved-search alerts (15 s poll) - exactly one instance, here
  useMarketAlerts();

  // Launch toast (outside the game it shows in the screen corner, see ToastLayer)
  useEffect(() => {
    const timer = setTimeout(() => showToast('is now running in the background...'), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Hotkeys only act while Diablo is the foreground window
  const checkDiabloFocus = useCallback(async (): Promise<boolean> => {
    if (!isTauri()) return true;
    try {
      return await invoke<boolean>('is_diablo_focused');
    } catch (error) {
      console.warn('[AppController] Failed to check Diablo focus:', error);
      return true;
    }
  }, []);

  /**
   * Ctrl+C the item under the cursor, restoring the user's clipboard afterwards. `copied`: the clipboard changed, so
   * the game copied something.
   */
  const copyItemUnderCursor = useCallback(
    async (sendCopy: boolean): Promise<{ raw: string | null; copied: boolean }> => {
      // A panel holding the keyboard (e.g. an open price check) would get the Ctrl+C, and a Ctrl+C hotkey never
      // reached the game: hand focus back and let the game take the foreground before copying.
      const handedBack = isKeyboardClaimed();
      if (handedBack) {
        await releaseKeyboard({ focusGame: true });
        await sleep(50);
      }
      const savedClipboard = await read();
      if (sendCopy || handedBack) await keyPress('ctrl+c');
      await sleep(250);
      const raw = await read();
      // Best-effort and not awaited: a restore that waits for a busy Windows clipboard must not delay the panel
      if (savedClipboard != null) void copy(savedClipboard);
      return { raw, copied: !!raw && raw !== savedClipboard };
    },
    [read, copy, keyPress],
  );

  const fireSearch = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;
    // When the price-check hotkey itself is Ctrl+C the game already copied the item
    const { raw, copied } = await copyItemUnderCursor(
      !(settings.hotkeyModifier === 'ctrl' && settings.hotkeyKey === 'c'),
    );
    if (!clipboardContainsValidItem(raw)) {
      showToast({ title: 'PD2 Trader', description: copied ? UNSUPPORTED_ITEM : NOTHING_COPIED, variant: 'error' });
      return;
    }
    openPanel('itemSearch', { text: encodeItem(raw) });
  }, [checkDiabloFocus, copyItemUnderCursor, openPanel, settings.hotkeyModifier, settings.hotkeyKey]);

  const openQuickList = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;
    const { raw: copiedRaw, copied } = await copyItemUnderCursor(true);
    const raw = clipboardContainsValidItem(copiedRaw) ? copiedRaw : null;

    let payload: PanelPayloads['quickList'] = { error: 'not_shared_stash' };
    if (raw && isStashItem(raw)) payload = { item: encodeItemForQuickList(raw) };
    openPanel('quickList', payload, { placement: 'cursor' });

    // After opening so the toast shows above the panel
    if (!raw) {
      showToast({
        title: 'Cannot List Item',
        description: copied ? UNSUPPORTED_ITEM : NOTHING_COPIED,
        variant: 'error',
      });
    } else if (!isStashItem(raw)) {
      showToast({
        title: 'Cannot List Item',
        description: 'This item is not in your shared stash and cannot be listed.',
        variant: 'error',
      });
    }
  }, [checkDiabloFocus, copyItemUnderCursor, openPanel]);

  const handleDelistItem = useCallback(async () => {
    if (!(await checkDiabloFocus())) return;
    const { raw } = await copyItemUnderCursor(true);
    if (!clipboardContainsValidItem(raw)) {
      showToast({ title: 'Delist', description: 'No valid item found under cursor.', variant: 'error' });
      return;
    }
    void delistItem(raw);
  }, [checkDiabloFocus, copyItemUnderCursor, delistItem]);

  // Registered global hotkeys call through this ref: re-renders (overlay, settings, net worth) never hand
  // useAppShortcuts new handlers, so it re-registers only when a hotkey setting changes (a press during an
  // unregister/register cycle would be lost).
  const hotkeyHandlers = {
    itemSearch: fireSearch,
    quickList: openQuickList,
    currency: async () => {
      if (await checkDiabloFocus()) openPanel('currency');
    },
    // Opening with unread messages lands on the newest unread thread (the badge leaves out muted ones)
    chat: () => (getBadgeCount('chatUnread') > 0 ? togglePanel('chat', { newestUnread: true }) : togglePanel('chat')),
    // Like the Offers button: the view of what the offers badge counts
    offers: () => openOffers((payload) => openPanel('chat', payload)),
    delist: handleDelistItem,
    snapshot: async () => {
      await takeSnapshot('manual');
    },
    // Closed: reopens on the search it was showing (keepMounted)
    market: () => togglePanel('market'),
    builds: () => togglePanel('builds'),
  };
  const hotkeysRef = useRef(hotkeyHandlers);
  useEffect(() => {
    hotkeysRef.current = hotkeyHandlers;
  });
  const onItemSearch = useCallback(() => hotkeysRef.current.itemSearch(), []);
  const onQuickList = useCallback(() => hotkeysRef.current.quickList(), []);
  const onCurrency = useCallback(() => hotkeysRef.current.currency(), []);
  const onChat = useCallback(() => hotkeysRef.current.chat(), []);
  const onOffers = useCallback(() => hotkeysRef.current.offers(), []);
  const onDelist = useCallback(() => hotkeysRef.current.delist(), []);
  const onSnapshot = useCallback(() => hotkeysRef.current.snapshot(), []);
  const onMarket = useCallback(() => hotkeysRef.current.market(), []);
  const onBuilds = useCallback(() => hotkeysRef.current.builds(), []);
  useAppShortcuts(onItemSearch, onQuickList, onCurrency, onChat, onOffers, onDelist, onSnapshot, onMarket, onBuilds);

  useAppUpdates();
  usePD2Auth();

  // Chat button overlay follows its setting (chat is a keepMounted panel: no warm-up needed)
  useEffect(() => {
    if (isLoading) return;
    if (settings.chatButtonOverlayEnabled === false) closePanel('chatButton');
    else openPanel('chatButton');
  }, [isLoading, settings.chatButtonOverlayEnabled, openPanel, closePanel]);

  // Chat watcher runs while whisper or trade notifications are enabled
  useEffect(() => {
    if (!isTauri() || isLoading) return;
    const shouldWatch = (settings.whisperNotificationsEnabled ?? true) || (settings.tradeNotificationsEnabled ?? true);
    const command = shouldWatch
      ? invoke('start_chat_watcher', { customD2Dir: settings.diablo2Directory })
      : invoke('stop_chat_watcher');
    command.catch((error) => {
      // No chat log in the configured Diablo II directory: a settings problem the Rust side already toasts to the user
      if (String(error).startsWith(CHAT_LOG_MISSING)) console.warn('Chat watcher not started:', error);
      else console.error('Failed to manage chat watcher:', error);
    });
    return () => {
      invoke('stop_chat_watcher').catch(console.error);
    };
  }, [settings.whisperNotificationsEnabled, settings.tradeNotificationsEnabled, settings.diablo2Directory, isLoading]);

  return <WhatsNewOnUpgrade />;
};

/** Its own component: What's New watches the sign-in panel, which re-renders on every overlay state change. */
function WhatsNewOnUpgrade() {
  useChangelog();
  return null;
}

export default AppController;
