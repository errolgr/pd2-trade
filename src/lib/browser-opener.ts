/**
 * Browser-compatible URL opener
 * Uses window.open in browser, falls back to Tauri opener in Tauri environment
 */

/**
 * Open a URL
 */
export async function openUrl(url: string): Promise<void> {
  try {
    // Try Tauri API first
    const { openUrl: tauriOpenUrl } = await import('@tauri-apps/plugin-opener');
    await tauriOpenUrl(url);
    return;
  } catch {
    // Fallback to window.open
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

