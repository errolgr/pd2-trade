import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { GenericToastPayload } from '@/common/types/Events';
import { useOptions } from '@/hooks/useOptions';
import poeWhisperSound from '@/assets/poe_whisper.mp3';

interface WhisperEvent {
  isTrade: boolean;
  from: string;
  message: string;
  itemName?: string;
  isJoin: boolean;
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
    console.error('Failed to create audio element:', error);
  }
}

export const useWhisperNotifications = (enabled: boolean) => {
  const unlistenRef = useRef<(() => void) | null>(null);
  const { settings } = useOptions();

  useEffect(() => {
    if (!isTauri() || !enabled) {
      return;
    }

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unlisten = await listen<WhisperEvent>('whisper-received', async (event) => {
          const whisper = event.payload;
          
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
              emit('toast-event', toastPayload);
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
                emit('toast-event', toastPayload);
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

        unlistenRef.current = unlisten;
      } catch (error) {
        console.error('Failed to set up whisper listener:', error);
      }
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, [enabled, settings?.whisperIgnoreList, settings?.whisperAnnouncementsEnabled, settings?.whisperJoinNotificationsEnabled, settings?.whisperNotificationsEnabled, settings?.tradeNotificationsEnabled, settings?.whisperNotificationTiming, settings?.whisperNotificationVolume]);
};

