/**
 * Browser-compatible URL opener
 * Uses Tauri opener in Tauri environment, falls back to window.open in browser
 */

import { isTauri, invoke } from '@tauri-apps/api/core';

/**
 * Open a URL
 */
export async function openUrl(url: string, token?: string): Promise<void> {
  if (isTauri()) {
    try {
      // Use internal webview browser (works reliably on Linux AppImages)
      await invoke('open_browser_window', { url, token });
    } catch (err) {
      console.error('Failed to open internal browser:', err);
    }
    return;
  }

  // Browser fallback: use window.open
  window.open(url, '_blank', 'noopener,noreferrer');
}
