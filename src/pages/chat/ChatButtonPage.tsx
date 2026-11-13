import React, { useRef } from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { useOptions } from '@/hooks/useOptions';
import { useTranslation } from '@/i18n';
import { confirmToast, showToast, useBadgeCount, useOverlay } from '@/overlay';
import { NET_WORTH_PANEL_SIZE, panelBesideTicker } from '@/pages/net-worth/overlay';
import { chatDockLayout, chatDockRect, clampDockOffset, setChatDockOffset, useChatDockOffset } from './chat-dock';
import { chatFeedActions, openOffers, useChatFeed } from './chat-feed';
import { ChatPeek } from './components/ChatPeek';
import { useMissedNotifications } from '@/lib/notification-log';
import { NOTIFICATION_LOG_SIZE } from '@/pages/notifications/size';

/** Gap (px) between the dock and the net worth panel it opens. */
const PANEL_GAP = 8;
/** Room (px) the menu needs above the tab; with less, it opens below. */
const MENU_ROOM = 300;

const ChatButtonPage: React.FC = () => {
  const { t } = useTranslation('chat');
  const { settings, updateSettings } = useOptions();
  const { openPanel, togglePanel, gameRect } = useOverlay();
  const unreadCount = useBadgeCount('chatUnread');
  // One offers badge: new offer notifications + new trade whispers
  const tradeOffersCount = useBadgeCount('whisperTrades') + useBadgeCount('tradeOffers');
  const feed = useChatFeed();
  const offset = useChatDockOffset();
  const { order, favorites } = chatDockLayout(settings);
  const missed = useMissedNotifications();
  // The log's button sits on the tab only while something is missed
  const buttons = favorites.length + (missed.count > 0 ? 1 : 0);
  const dock = chatDockRect(gameRect, offset, buttons);
  const dragStart = useRef<number | null>(null);

  const handleDisableClick = () =>
    confirmToast({
      title: t('button.disableTitle'),
      description: t('button.disableDescription'),
      confirmLabel: t('button.disable'),
      onConfirm: async () => {
        await updateSettings({ chatButtonOverlayEnabled: false });
        showToast(t('button.disabledToast'));
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
        onSimClick={() => openPanel('sim')}
        onNetWorthClick={() =>
          openPanel('netWorthPanel', undefined, {
            placement: panelBesideTicker(dock, NET_WORTH_PANEL_SIZE, gameRect, PANEL_GAP),
          })
        }
        onStashValueClick={() => openPanel('currency')}
        // Already open (e.g. mid-listing): just bring it forward instead of switching it to manage mode
        onManageListingsClick={() => openPanel('quickList', undefined, { keepPayload: true })}
        onSettingsClick={() => openPanel('settings')}
        onDisableClick={handleDisableClick}
        order={order}
        favorites={favorites}
        onOrderChange={(next) => updateSettings({ chatDockOrder: next })}
        onFavoritesChange={(next) => updateSettings({ chatDockFavorites: next })}
        unreadCount={unreadCount}
        tradeOffersCount={tradeOffersCount}
        // Slides along the edge: dragging down lowers the tab (smaller offset above the game's bottom)
        onDrag={(dy) => {
          dragStart.current ??= offset;
          setChatDockOffset(clampDockOffset(dragStart.current - dy / gameRect.height, gameRect.height, buttons), false);
        }}
        onDragEnd={() => {
          dragStart.current = null;
          setChatDockOffset(offset);
        }}
        menuBelow={dock.y - gameRect.y < MENU_ROOM}
        missed={{
          count: missed.count,
          urgent: missed.urgent,
          latest: missed.latest?.description ?? missed.latest?.title,
        }}
        onNotificationsClick={() =>
          openPanel('notifications', undefined, {
            placement: panelBesideTicker(dock, NOTIFICATION_LOG_SIZE, gameRect, PANEL_GAP),
          })
        }
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
