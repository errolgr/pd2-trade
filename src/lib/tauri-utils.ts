/**
 * Utility to check if we're running in a Tauri environment
 * Falls back to checking for window.__TAURI__ in browser
 */
export async function isTauri(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check if Tauri API is available
  if (typeof (window as any).__TAURI__ !== 'undefined') {
    return true;
  }
  
  // Try to use the Tauri API's isTauri function if available
  try {
    const { isTauri: tauriIsTauri } = await import('@tauri-apps/api/core');
    return tauriIsTauri();
  } catch {
    return false;
  }
}

/**
 * Synchronous check for Tauri (for use in non-async contexts)
 * This checks for the presence of window.__TAURI__
 */
export function isTauriSync(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.__TAURI__ !== 'undefined';
}

