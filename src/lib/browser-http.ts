/**
 * Browser-compatible HTTP utilities
 * Uses native fetch in browser with proxy, falls back to Tauri HTTP plugin in Tauri environment
 */

import { isTauriSync } from './tauri-utils';

/**
 * Convert a URL to use the proxy if we're in browser mode
 */
function getProxiedUrl(url: string | URL): string {
  if (isTauriSync()) {
    // In Tauri, use the URL as-is
    return typeof url === 'string' ? url : url.toString();
  }
  
  // In browser, use the Vite proxy
  const urlString = typeof url === 'string' ? url : url.toString();
  
  // Check if it's a projectdiablo2.com API URL
  if (urlString.includes('api.projectdiablo2.com')) {
    // Replace with proxy path
    return urlString.replace('https://api.projectdiablo2.com', '/api');
  }
  
  // For other URLs, return as-is (they might have their own CORS handling)
  return urlString;
}

export async function fetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    // Try Tauri API first
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return await tauriFetch(input, init);
  } catch {
    // Fallback to native fetch with proxy in browser
    const proxiedUrl = getProxiedUrl(input);
    return window.fetch(proxiedUrl, init);
  }
}

