import React from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { useOptions } from '@/hooks/useOptions';
import { confirmToast, showToast, useBadgeCount, useOverlay } from '@/overlay';
import { NET_WORTH_PANEL_SIZE, panelBesideTicker } from '@/pages/net-worth/overlay';
import { chatDockMetrics, chatDockRect } from './chat-dock';

/** Gap (px) between the dock and the net worth panel it opens. */
const PANEL_GAP = 8;

const ChatButtonPage: React.FC = () => {
  const { updateSettings } = useOptions();
  const { openPanel, togglePanel, gameRect } = useOverlay();
  const unreadCount = useBadgeCount('chatUnread');
  // One offers badge: open trade whispers + website offers
  const tradeOffersCount = useBadgeCount('whisperTrades') + useBadgeCount('tradeOffers');
  const { width, height, inset } = chatDockMetrics(gameRect.height);

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
    // The panel frame sits flush on the game's bottom-right corner; the pill keeps its inset inside it.
    <div className="pointer-events-none absolute"
      style={{ right: inset, bottom: inset, width, height }}>
      <ChatButton
        size={{ width, height }}
        // Same as the chat hotkey: with unread messages, land on the newest unread thread
        onChatClick={() => (unreadCount > 0 ? togglePanel('chat', { newestUnread: true }) : togglePanel('chat'))}
        onOffersClick={() => openPanel('chat', { filter: 'selling' })}
        onMarketClick={() => openPanel('market')}
        onNetWorthClick={() =>
          openPanel('netWorthPanel', undefined, {
            placement: panelBesideTicker(chatDockRect(gameRect), NET_WORTH_PANEL_SIZE, gameRect, PANEL_GAP),
          })
        }
        onStashValueClick={() => openPanel('currency')}
        // Already open (e.g. mid-listing): just bring it forward instead of switching it to manage mode
        onManageListingsClick={() => openPanel('quickList', undefined, { placement: 'gameCenter', keepPayload: true })}
        onSettingsClick={() => openPanel('settings')}
        onDisableClick={handleDisableClick}
        unreadCount={unreadCount}
        tradeOffersCount={tradeOffersCount}
      />
    </div>
  );
};

export default ChatButtonPage;
