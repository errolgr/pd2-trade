import { useEffect, useRef } from 'react';
import { listen as listenBrowser } from '@/lib/browser-events';
import { listen as listenTauri } from '@tauri-apps/api/event';
import { emit } from '@/lib/browser-events';
import { emit as emitTauri } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { ISettings } from './useOptions';
import poeWhisperSound from '@/assets/poe_whisper.mp3';

interface SystemNotification {
  _id: string;
  user_id: string;
  data: {
    listing_id?: string;
  };
  meta: {
    string?: string;
  };
  type: string;
  created_at: string;
  updated_at: string;
}

interface WhisperEvent {
  isTrade: boolean;
  from: string;
  message: string;
  itemName?: string;
  isJoin: boolean;
  isIncoming: boolean;
}

interface UseSocketNotificationsProps {
  isConnected: boolean;
  settings?: ISettings;
  whisperNotificationsEnabled?: boolean;
}

// Play the notification sound from assets
function playNotificationSound(volume: number = 70) {
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

export const useSocketNotifications = ({ 
  isConnected, 
  settings,
  whisperNotificationsEnabled = true 
}: UseSocketNotificationsProps) => {
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  // Listen for offer received notifications via socket
  useEffect(() => {
    if (!isConnected) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listenBrowser<SystemNotification>('socket:system/notification_pushed', async (event) => {
          const notification = event.payload;
          
          // Only handle offer_received notifications
          if (notification.type === 'offer_received' && notification.data?.listing_id) {
            // Prevent duplicate notifications by tracking processed notification IDs
            if (processedNotificationsRef.current.has(notification._id)) {
              return;
            }
            
            // Mark this notification as processed
            processedNotificationsRef.current.add(notification._id);
            
            // Clean up old notification IDs (keep only last 100)
            if (processedNotificationsRef.current.size > 100) {
              const idsArray = Array.from(processedNotificationsRef.current);
              processedNotificationsRef.current = new Set(idsArray.slice(-100));
            }
            
            const listingId = notification.data.listing_id;
            const offerMessage = notification.meta?.string || 'New offer received';
            
            // Play notification sound
            const volume = settings?.whisperNotificationVolume ?? 70;
            playNotificationSound(volume);
            
            // Show toast notification with link to listing
            await emit('toast-event', {
              title: 'New Offer',
              description: offerMessage,
              action: {
                label: 'View Listing',
                type: ToastActionType.OPEN_MARKET_LISTING,
                data: {
                  listingId: listingId,
                },
              },
            });

            // Emit event to refresh offers (this will be handled by useTradeOffers)
            await emit('refresh-offers');
          }
        });
      } catch (error) {
        console.error('Failed to set up offer notification listener:', error);
      }
    };

    setupListener();

    return () => {
      // Cleanup: unlisten when component unmounts or dependencies change
      if (unlisten) {
        unlisten();
        unlisten = null;
      }
    };
  }, [isConnected, settings?.whisperNotificationVolume]);

  // Listen for whisper notifications (Tauri only)
  useEffect(() => {
    if (!isTauri() || !whisperNotificationsEnabled) {
      return;
    }

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const unlistenFn = await listenTauri<WhisperEvent>('whisper-received', async (event) => {
          const whisper = event.payload;
          
          // Skip outgoing messages (messages sent by the user)
          if (!whisper.isIncoming) {
            return;
          }
          
          // Handle join messages separately
          if (whisper.isJoin) {
            // Only notify if join notifications are enabled and Diablo is not focused
            const isDiabloFocused = await invoke<boolean>('is_diablo_focused');
            if ((settings?.whisperJoinNotificationsEnabled ?? false) && !isDiabloFocused) {
              // Play notification sound
              const volume = settings?.whisperNotificationVolume ?? 70;
              playNotificationSound(volume);
              
              const toastPayload: GenericToastPayload = {
                title: 'Player Joined',
                description: `${whisper.from} joined the game`,
                duration: 5000,
                variant: 'default',
              };
              emitTauri('toast-event', toastPayload);
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
          const isIgnored = ignoreList.some(
            (ignoredPlayer) => normalizeName(ignoredPlayer) === whisperFromNormalized
          );
          
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
              if (whisper.itemName && !isDiabloFocused) {
                const toastPayload: GenericToastPayload = {
                  title: 'Trade Whisper',
                  description: `${whisper.from}: ${whisper.itemName}`,
                  duration: 5000,
                  variant: 'success',
                };
                emitTauri('toast-event', toastPayload);
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
          }
        });

        unlisten = unlistenFn;
      } catch (error) {
        console.error('Failed to set up whisper listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
        unlisten = undefined;
      }
    };
  }, [
    whisperNotificationsEnabled,
    settings?.whisperIgnoreList,
    settings?.whisperAnnouncementsEnabled,
    settings?.whisperJoinNotificationsEnabled,
    settings?.whisperNotificationsEnabled,
    settings?.tradeNotificationsEnabled,
    settings?.whisperNotificationTiming,
    settings?.whisperNotificationVolume,
  ]);
};

