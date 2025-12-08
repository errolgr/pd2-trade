/**
 * Browser-compatible app utilities
 * Provides fallbacks for Tauri app operations when running in browser
 */

import { isTauri } from '@tauri-apps/api/core';

/**
 * Get app version
 * In browser, returns a default version or reads from package.json
 */
export async function getVersion(): Promise<string> {
  if (isTauri()) {
    const { getVersion: tauriGetVersion } = await import('@tauri-apps/api/app');
    return await tauriGetVersion();
  }
  
  // Browser fallback: return a default version or try to read from package.json
  // In a real app, you might want to inject this at build time
  return '0.0.0-browser';
}

