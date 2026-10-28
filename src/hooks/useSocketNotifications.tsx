import { useEffect, useRef } from 'react';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { usePd2Website } from './pd2website/usePD2Website';
import { toOfferNotification } from './pd2website/useOfferNotifications';
import { ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { ISettings } from './useOptions';
// PCM WAV, not MP3: Linux WebKitGTK without an MP3 GStreamer decoder rejects MP3 with NotSupportedError, while
// WAV only needs the plugins every GStreamer audio output already pulls in (WebView2 / WKWebView play both).
import poeWhisperSound from '@/assets/poe_whisper.wav';
import { showToast } from '@/overlay';
import { isThreadMuted, loadChatPrefs } from '@/lib/chat-prefs';
import { normalizeName as personKey } from '@/lib/whisper-history';
import { whisperThreadId } from '@/pages/chat/lib/identity';

interface WhisperEvent {
  isTrade: boolean;
  from: string;
  message: string;
  itemName?: string;
  isJoin: boolean;
  isIncoming: boolean;
}

interface UseSocketNotificationsProps {
  settings?: ISettings;
  whisperNotificationsEnabled?: boolean;
}

interface ChatMessagePush {
  _id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  sender?: { _id?: string; display_name?: string; username?: string };
}

/** Plays the whisper notification sound at `volume` (0-100); also the market alert sound. */
export function playNotificationSound(volume: number = 70) {
  try {
    const audio = new Audio(poeWhisperSound);
    audio.volume = volume / 100; // Convert 0-100 to 0-1
    audio.play().catch((error) => {
      console.error('Failed to play notification sound:', error);
    });
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

export function isToastEnabled(settings: ISettings | undefined, type: string): boolean {
  if (!(settings?.toastPopupsEnabled ?? true)) return false;
  const types = settings?.toastPopupTypes ?? ['whispers', 'trade', 'joins', 'offers', 'networth'];
  return types.includes(type);
}

/** Exactly one instance (AppController): socket offer/chat pushes and Rust whisper events -> sound + toasts. */
export const useSocketNotifications = ({
  settings,
  whisperNotificationsEnabled = true,
}: UseSocketNotificationsProps) => {
  const { isConnected, subscribeSocket, refresh: refreshOffers } = usePd2Website();
  const processedNotificationsRef = useRef<Set<string>>(new Set());
  // Muted chat threads get no sound and no toast
  useEffect(loadChatPrefs, []);

  // PD2's offer notifications: offer_received (an offer on your listing), offer_accepted (the seller accepted
  // your offer), offer_revoked (a buyer withdrew theirs). Read leniently (only `type` is relied on); the offers
  // badge counts them (useOfferNotifications).
  useEffect(() => {
    if (!isConnected) return;

    return subscribeSocket<unknown>('system/notification_pushed', (raw) => {
      const notification = toOfferNotification(raw, Date.now());
      if (!notification) {
        // Other kinds exist; note which (never the payload)
        const type = (raw as { type?: unknown } | null)?.type;
        console.debug('[Notifications] Unhandled system/notification push type:', String(type));
        return;
      }
      if (processedNotificationsRef.current.has(notification.id)) return;
      processedNotificationsRef.current.add(notification.id);

      // Clean up old notification IDs (keep only last 100)
      if (processedNotificationsRef.current.size > 100) {
        const idsArray = Array.from(processedNotificationsRef.current);
        processedNotificationsRef.current = new Set(idsArray.slice(-100));
      }

      // Refresh the trade offers list (owned by Pd2WebsiteProvider)
      refreshOffers();
      // A withdrawn offer just leaves the lists
      if (notification.type === 'offer_revoked') return;

      const { listingId } = notification;
      const accepted = notification.type === 'offer_accepted';
      const offerMessage = notification.text || (accepted ? 'Your offer was accepted' : 'New offer received');

      // Play notification sound if trade notifications are enabled
      const tradeEnabled = settings?.tradeNotificationsEnabled ?? true;
      if (tradeEnabled) {
        const volume = settings?.whisperNotificationVolume ?? 70;
        playNotificationSound(volume);
      }

      // Show toast notification with link to listing
      if (isToastEnabled(settings, 'offers')) {
        showToast({
          title: accepted ? 'Offer Accepted' : 'New Offer',
          description: offerMessage,
          action: listingId
            ? { label: 'View Listing', type: ToastActionType.OPEN_MARKET_LISTING, data: { listingId } }
            : undefined,
        });
      }
    });
  }, [
    isConnected,
    subscribeSocket,
    refreshOffers,
    settings?.whisperNotificationVolume,
    settings?.tradeNotificationsEnabled,
    settings?.toastPopupsEnabled,
    settings?.toastPopupTypes,
  ]);

  // Listen for whisper notifications (Tauri only)
  useEffect(() => {
    if (!isTauri() || !whisperNotificationsEnabled) {
      return;
    }

    return holdListener(
      listen<WhisperEvent>('whisper-received', async (event) => {
        const whisper = event.payload;

        // Skip outgoing messages (messages sent by the user)
        if (!whisper.isIncoming) {
          return;
        }

        // Their chat thread (a whisper sender's thread id, see lib/chat-prefs) is muted
        const threadId = whisperThreadId(personKey(whisper.from));
        if (isThreadMuted([threadId])) return;
        const reply = {
          label: 'Reply',
          type: ToastActionType.OPEN_CHAT_CONVERSATION,
          data: { threadId },
        };

        // Handle join messages separately
        if (whisper.isJoin) {
          // Only notify if join notifications are enabled and Diablo is not focused
          const isDiabloFocused = await invoke<boolean>('is_diablo_focused');
          if ((settings?.whisperJoinNotificationsEnabled ?? false) && !isDiabloFocused) {
            // Play notification sound
            const volume = settings?.whisperNotificationVolume ?? 70;
            playNotificationSound(volume);

            if (isToastEnabled(settings, 'joins')) {
              const toastPayload: GenericToastPayload = {
                title: 'Player Joined',
                description: `${whisper.from} joined the game`,
                duration: 5000,
                variant: 'default',
              };
              showToast(toastPayload);
            }
          }
          return; // Don't process join messages as regular whispers
        }

        // Normalize name (case-insensitive, ignore "*" prefix)
        const normalizeName = (name: string) => name.toLowerCase().replace(/^\*/, '');
        const whisperFromNormalized = normalizeName(whisper.from);

        // Check if it's an announcement (default: ignore unless enabled)
        const isAnnouncement = whisperFromNormalized === 'announcements';
        if (isAnnouncement && !(settings?.whisperAnnouncementsEnabled ?? false)) {
          return; // Skip announcements by default
        }

        // Check if player is in ignore list
        const ignoreList = settings?.whisperIgnoreList || [];
        const isIgnored = ignoreList.some((ignoredPlayer) => normalizeName(ignoredPlayer) === whisperFromNormalized);

        if (isIgnored) {
          return; // Skip ignored players
        }

        // Check if Diablo is focused
        const isDiabloFocused = await invoke<boolean>('is_diablo_focused');

        // Determine if we should notify based on timing setting
        const timing = settings?.whisperNotificationTiming || 'both';

        // If timing is 'never', don't notify at all
        if (timing === 'never') {
          return;
        }

        const shouldNotifyByTiming =
          timing === 'both' ||
          (timing === 'in-game' && isDiabloFocused) ||
          (timing === 'out-of-game' && !isDiabloFocused);

        if (!shouldNotifyByTiming) {
          return; // Don't notify based on timing setting
        }

        // Handle trade whispers
        if (whisper.isTrade) {
          const tradeEnabled = settings?.tradeNotificationsEnabled ?? true;
          if (tradeEnabled) {
            // Play notification sound
            const volume = settings?.whisperNotificationVolume ?? 70;
            playNotificationSound(volume);

            // Show toast with item name only if Diablo is not focused
            if (whisper.itemName && !isDiabloFocused && isToastEnabled(settings, 'trade')) {
              showToast({
                title: 'Trade Whisper',
                description: `${whisper.from}: ${whisper.itemName}`,
                duration: 5000,
                action: reply,
              });
            }
          }
          return; // Trade whispers handled
        }

        // Handle general whispers (non-trade)
        const generalEnabled = settings?.whisperNotificationsEnabled ?? true;
        if (generalEnabled) {
          // Play notification sound
          const volume = settings?.whisperNotificationVolume ?? 70;
          playNotificationSound(volume);

          // Show toast when tabbed out of Diablo
          if (!isDiabloFocused && isToastEnabled(settings, 'whispers')) {
            showToast({
              title: `Whisper from ${whisper.from}`,
              description: whisper.message.length > 80 ? whisper.message.slice(0, 80) + '...' : whisper.message,
              duration: 5000,
              action: reply,
            });
          }
        }
      }),
      'whisper-received',
    );
  }, [
    whisperNotificationsEnabled,
    settings?.whisperIgnoreList,
    settings?.whisperAnnouncementsEnabled,
    settings?.whisperJoinNotificationsEnabled,
    settings?.whisperNotificationsEnabled,
    settings?.tradeNotificationsEnabled,
    settings?.whisperNotificationTiming,
    settings?.whisperNotificationVolume,
    settings?.toastPopupsEnabled,
    settings?.toastPopupTypes,
  ]);

  // Listen for chat message notifications via socket (show toast popup)
  useEffect(() => {
    if (!isConnected) return;

    return subscribeSocket<ChatMessagePush>('social/message_pushed', (msg) => {
      if (!msg._id || !msg.sender_id || !msg.conversation_id) return;

      if (processedNotificationsRef.current.has(msg._id)) return;
      processedNotificationsRef.current.add(msg._id);
      if (processedNotificationsRef.current.size > 100) {
        const idsArray = Array.from(processedNotificationsRef.current);
        processedNotificationsRef.current = new Set(idsArray.slice(-100));
      }

      // Muted: the conversation, or (a conversation started after muting them) the sender's website user
      if (!isToastEnabled(settings, 'whispers') || isThreadMuted([msg.conversation_id, `user:${msg.sender_id}`])) {
        return;
      }

      const messagePreview = msg.content?.length > 80 ? msg.content.slice(0, 80) + '...' : msg.content;

      // Toasts can't take typing: Reply opens the conversation with the composer focused
      showToast({
        title: 'New Chat Message',
        description: messagePreview,
        action: {
          label: 'Reply',
          type: ToastActionType.OPEN_CHAT_CONVERSATION,
          data: { conversationId: msg.conversation_id },
        },
      });
    });
  }, [isConnected, subscribeSocket, settings?.toastPopupsEnabled, settings?.toastPopupTypes]);
};
