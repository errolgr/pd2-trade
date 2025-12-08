/**
 * Browser-compatible app utilities
 * Provides fallbacks for Tauri app operations when running in browser
 */

/**
 * Get app version
 * In browser, returns a default version or reads from package.json
 */
export async function getVersion(): Promise<string> {
  try {
    // Try Tauri API first
    const { getVersion: tauriGetVersion } = await import('@tauri-apps/api/app');
    return await tauriGetVersion();
  } catch {
    // Fallback: return a default version or try to read from package.json
    // In a real app, you might want to inject this at build time
    return '0.0.0-browser';
  }
}

