/**
 * Browser-compatible HTTP utilities
 * Uses native fetch in browser with proxy, falls back to Tauri HTTP plugin in Tauri environment
 */

import { isTauri } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

/**
 * Convert a URL to use the proxy if we're in browser mode
 */
function getProxiedUrl(input: RequestInfo | URL): string {
  if (isTauri()) {
    // In Tauri, use the URL as-is
    if (typeof input === 'string') {
      return input;
    } else if (input instanceof URL) {
      return input.toString();
    } else {
      // Request object
      return input.url;
    }
  }
  
  // In browser, use the Vite proxy
  let urlString: string;
  if (typeof input === 'string') {
    urlString = input;
  } else if (input instanceof URL) {
    urlString = input.toString();
  } else {
    // Request object
    urlString = input.url;
  }
  
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
  if (isTauri()) {
    return await tauriFetch(input, init);
  }
  
  // Browser fallback: use native fetch with proxy
  const proxiedUrl = getProxiedUrl(input);
  return window.fetch(proxiedUrl, init);
}

