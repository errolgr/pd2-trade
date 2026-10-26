import React, { useRef } from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { useOptions } from '@/hooks/useOptions';
import { confirmToast, showToast, useBadgeCount, useOverlay } from '@/overlay';
import { NET_WORTH_PANEL_SIZE, panelBesideTicker } from '@/pages/net-worth/overlay';
import { chatDockRect, clampDockOffset, setChatDockOffset, useChatDockOffset } from './chat-dock';
import { chatFeedActions, openOffers, useChatFeed } from './chat-feed';
import { ChatPeek } from './components/ChatPeek';

/** Gap (px) between the dock and the net worth panel it opens. */
const PANEL_GAP = 8;
/** Room (px) the menu needs above the tab; with less, it opens below. */
const MENU_ROOM = 300;

const ChatButtonPage: React.FC = () => {
  const { updateSettings } = useOptions();
  const { openPanel, togglePanel, gameRect } = useOverlay();
  const unreadCount = useBadgeCount('chatUnread');
  // One offers badge: new offer notifications + new trade whispers
  const tradeOffersCount = useBadgeCount('whisperTrades') + useBadgeCount('tradeOffers');
  const feed = useChatFeed();
  const offset = useChatDockOffset();
  const dock = chatDockRect(gameRect, offset);
  const dragStart = useRef<number | null>(null);

  const handleDisableClick = () =>
    confirmToast({
      title: 'Disable Chat Button Overlay?',
      description: 'You can re-enable it later in Settings → Interface.',
      confirmLabel: 'Disable',
      onConfirm: async () => {
        await updateSettings({ chatButtonOverlayEnabled: false });
        showToast('Chat button overlay disabled. Re-enable in Settings → Interface.');
      },
    });

  return (
    // The panel frame spans the game's right edge, full height (click-through); the tab sits at its saved height.
    <div
      className="pointer-events-none absolute right-0"
      style={{ top: dock.y - gameRect.y, width: dock.width, height: dock.height }}
    >
      <ChatButton
        size={dock}
        // Same as the chat hotkey: with unread messages, land on the newest unread thread
        onChatClick={() => (unreadCount > 0 ? togglePanel('chat', { newestUnread: true }) : togglePanel('chat'))}
        // The view of what its badge counts (which then counts as looked at)
        onOffersClick={() => openOffers((payload) => openPanel('chat', payload))}
        onMarketClick={() => openPanel('market')}
        onBuildsClick={() => openPanel('builds')}
        onNetWorthClick={() =>
          openPanel('netWorthPanel', undefined, {
            placement: panelBesideTicker(dock, NET_WORTH_PANEL_SIZE, gameRect, PANEL_GAP),
          })
        }
        onStashValueClick={() => openPanel('currency')}
        // Already open (e.g. mid-listing): just bring it forward instead of switching it to manage mode
        onManageListingsClick={() => openPanel('quickList', undefined, { placement: 'gameCenter', keepPayload: true })}
        onSettingsClick={() => openPanel('settings')}
        onDisableClick={handleDisableClick}
        unreadCount={unreadCount}
        tradeOffersCount={tradeOffersCount}
        // Slides along the edge: dragging down lowers the tab (smaller offset above the game's bottom)
        onDrag={(dy) => {
          dragStart.current ??= offset;
          setChatDockOffset(clampDockOffset(dragStart.current - dy / gameRect.height, gameRect.height), false);
        }}
        onDragEnd={() => {
          dragStart.current = null;
          setChatDockOffset(offset);
        }}
        menuBelow={dock.y - gameRect.y < MENU_ROOM}
        peek={(close) => (
          <ChatPeek
            items={feed.items}
            canMarkAllRead={feed.canMarkAllRead}
            now={Date.now()}
            onPick={(item) => {
              close();
              openPanel('chat', item.open);
            }}
            onMarkAllRead={() => chatFeedActions().markAllRead()}
            onOpenChat={() => {
              close();
              openPanel('chat', unreadCount > 0 ? { newestUnread: true } : undefined);
            }}
          />
        )}
      />
    </div>
  );
};

export default ChatButtonPage;
