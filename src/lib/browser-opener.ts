/**
 * Browser-compatible URL opener
 * Uses Tauri opener in Tauri environment, falls back to window.open in browser
 */

import { isTauri } from '@tauri-apps/api/core';

/**
 * Open a URL
 */
export async function openUrl(url: string): Promise<void> {
  if (isTauri()) {
    const { openUrl: tauriOpenUrl } = await import('@tauri-apps/plugin-opener');
    await tauriOpenUrl(url);
    return;
  }
  
  // Browser fallback: use window.open
  window.open(url, '_blank', 'noopener,noreferrer');
}

