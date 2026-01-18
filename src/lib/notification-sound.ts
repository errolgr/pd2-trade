import poeWhisperSound from '@/assets/poe_whisper.mp3';

/**
 * Play the notification sound from assets
 * @param volume Volume level (0-100), defaults to 70
 */
export function playNotificationSound(volume: number = 70): void {
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
