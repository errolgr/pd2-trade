/**
 * Browser-compatible URL opener
 * Uses Tauri opener in Tauri environment, falls back to window.open in browser
 */

import { isTauri } from '@tauri-apps/api/core';
import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener';

/**
 * Open a URL
 */
export async function openUrl(url: string): Promise<void> {
  if (isTauri()) {
    await tauriOpenUrl(url);
    return;
  }
  
  // Browser fallback: use window.open
  window.open(url, '_blank', 'noopener,noreferrer');
}

