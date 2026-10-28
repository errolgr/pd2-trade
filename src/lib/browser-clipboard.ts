/**
 * Browser-compatible clipboard utilities
 * Uses Tauri API in Tauri environment, falls back to browser Clipboard API
 */

import { isTauri } from '@tauri-apps/api/core';
import {
  readText as tauriReadText,
  writeImage as tauriWriteImage,
  writeText as tauriWriteText,
} from '@tauri-apps/plugin-clipboard-manager';

// Windows lets one process hold the clipboard at a time (clipboard managers, RDP, other apps briefly open it);
// arboard then fails with this message after its own ~30 ms of retries. Retrying a few times over ~half a
// second more gets through.
const CLIPBOARD_OCCUPIED = 'held by another party';
const OCCUPIED_RETRY_DELAYS_MS = [50, 150, 300];

async function retryWhileOccupied<T>(access: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await access();
    } catch (error) {
      if (attempt >= OCCUPIED_RETRY_DELAYS_MS.length || !String(error).includes(CLIPBOARD_OCCUPIED)) throw error;
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, OCCUPIED_RETRY_DELAYS_MS[attempt]);
      await promise;
    }
  }
}

/**
 * Read text from clipboard
 */
export async function readText(): Promise<string | null> {
  if (isTauri()) {
    try {
      return await retryWhileOccupied(() => tauriReadText());
    } catch (error) {
      console.warn('Failed to read clipboard:', error);
      return null;
    }
  }

  // Browser fallback: use Clipboard API
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    return null;
  } catch (error) {
    console.warn('Failed to read clipboard:', error);
    return null;
  }
}

/**
 * Write text to clipboard
 */
export async function writeText(text: string): Promise<void> {
  if (isTauri()) {
    try {
      await retryWhileOccupied(() => tauriWriteText(text));
      return;
    } catch (error) {
      console.error('Failed to write to clipboard:', error);
      throw error;
    }
  }

  // Browser fallback: use Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    throw new Error('Clipboard API not available');
  }
}

/**
 * Write a PNG image to the clipboard (paste into Discord, Reddit, etc.).
 */
export async function writePng(png: Blob): Promise<void> {
  if (isTauri()) {
    await retryWhileOccupied(async () => tauriWriteImage(new Uint8Array(await png.arrayBuffer())));
    return;
  }

  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard API not available');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
