/**
 * Browser-compatible clipboard utilities
 * Uses Tauri API in Tauri environment, falls back to browser Clipboard API
 */

import { isTauri } from '@tauri-apps/api/core';

/**
 * Read text from clipboard
 */
export async function readText(): Promise<string | null> {
  if (isTauri()) {
    try {
      const { readText: tauriReadText } = await import('@tauri-apps/plugin-clipboard-manager');
      return await tauriReadText();
    } catch (error) {
      console.error('Failed to read clipboard:', error);
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
    console.error('Failed to read clipboard:', error);
    return null;
  }
}

/**
 * Write text to clipboard
 */
export async function writeText(text: string): Promise<void> {
  if (isTauri()) {
    try {
      const { writeText: tauriWriteText } = await import('@tauri-apps/plugin-clipboard-manager');
      await tauriWriteText(text);
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

