/**
 * Browser-compatible app utilities
 * Provides fallbacks for Tauri app operations when running in browser
 */

import { isTauri } from '@tauri-apps/api/core';
import { getVersion as tauriGetVersion } from '@tauri-apps/api/app';

/**
 * Get app version
 * In browser, returns a default version or reads from package.json
 */
export async function getVersion(): Promise<string> {
  if (isTauri()) {
    return await tauriGetVersion();
  }
  
  // Browser fallback: return a default version or try to read from package.json
  // In a real app, you might want to inject this at build time
  return '0.0.0-browser';
}

