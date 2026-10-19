import React from 'react';
import { ChatButton } from '@/components/custom/ChatButton';
import { useOptions } from '@/hooks/useOptions';
import { confirmToast, showToast, useBadgeCount, useOverlay } from '@/overlay';

const ChatButtonPage: React.FC = () => {
  const { updateSettings } = useOptions();
  const { openPanel, togglePanel } = useOverlay();
  const unreadCount = useBadgeCount('chatUnread');
  // One offers badge: open trade whispers + website offers
  const tradeOffersCount = useBadgeCount('whisperTrades') + useBadgeCount('tradeOffers');

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
    <div className="pointer-events-none relative h-full w-full">
      <ChatButton
        handleClick={() => togglePanel('chat')}
        onSettingsClick={() => openPanel('settings')}
        onOffersClick={() => openPanel('chat', { filter: 'selling' })}
        // Already open (e.g. mid-listing): just bring it forward instead of switching it to manage mode
        onManageListingsClick={() => openPanel('quickList', undefined, { placement: 'gameCenter', keepPayload: true })}
        onDisableClick={handleDisableClick}
        unreadCount={unreadCount}
        tradeOffersCount={tradeOffersCount}
      />
    </div>
  );
};

export default ChatButtonPage;
