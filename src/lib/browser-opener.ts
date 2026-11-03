/**
 * Browser-compatible URL opener
 * Uses the app's opener (src-tauri modules/opener.rs) in Tauri, falls back to window.open in browser
 */

import { invoke, isTauri } from '@tauri-apps/api/core';

/**
 * Open a URL in the system browser. In Tauri it rejects when nothing could open it.
 */
export async function openUrl(url: string): Promise<void> {
  if (isTauri()) {
    await invoke('open_url', { url });
    return;
  }

  // Browser fallback: use window.open
  window.open(url, '_blank', 'noopener,noreferrer');
}
