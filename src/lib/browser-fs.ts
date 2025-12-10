/**
 * Browser-compatible file system utilities
 * Uses Tauri FS API in Tauri environment, falls back to localStorage in browser
 */

import { isTauri } from '@tauri-apps/api/core';
import { BaseDirectory } from '@tauri-apps/api/path';
import { readTextFile as tauriReadTextFile, writeTextFile as tauriWriteTextFile, exists as tauriExists, mkdir as tauriMkdir } from '@tauri-apps/plugin-fs';

// Re-export for convenience
export { BaseDirectory };

interface ReadTextFileOptions {
  baseDir?: BaseDirectory;
}

interface WriteTextFileOptions {
  baseDir?: BaseDirectory;
}

interface ExistsOptions {
  baseDir?: BaseDirectory;
}

interface MkdirOptions {
  baseDir?: BaseDirectory;
  recursive?: boolean;
}

/**
 * Get storage key for a file path
 */
function getStorageKey(path: string, baseDir?: BaseDirectory): string {
  const prefix = baseDir ? `${baseDir}/` : '';
  return `fs:${prefix}${path}`;
}

/**
 * Read text file
 */
export async function readTextFile(
  path: string,
  options: ReadTextFileOptions = {}
): Promise<string> {
  if (isTauri()) {
    return await tauriReadTextFile(path, options as any);
  }
  
  // Browser fallback: use localStorage
  const key = getStorageKey(path, options.baseDir);
  const content = localStorage.getItem(key);
  if (content === null) {
    throw new Error(`File not found: ${path}`);
  }
  return content;
}

/**
 * Write text file
 */
export async function writeTextFile(
  path: string,
  contents: string,
  options: WriteTextFileOptions = {}
): Promise<void> {
  if (isTauri()) {
    await tauriWriteTextFile(path, contents, options as any);
    return;
  }
  
  // Browser fallback: use localStorage
  const key = getStorageKey(path, options.baseDir);
  localStorage.setItem(key, contents);
}

/**
 * Check if file/directory exists
 */
export async function exists(
  path: string,
  options: ExistsOptions = {}
): Promise<boolean> {
  if (isTauri()) {
    return await tauriExists(path, options as any);
  }
  
  // Browser fallback: use localStorage
  const key = getStorageKey(path, options.baseDir);
  return localStorage.getItem(key) !== null;
}

/**
 * Create directory
 */
export async function mkdir(
  path: string,
  options: MkdirOptions = {}
): Promise<void> {
  if (isTauri()) {
    await tauriMkdir(path, options as any);
    return;
  }
  
  // Browser fallback: directories are implicit in localStorage
  // We just ensure the path exists by creating a marker
  if (options.recursive) {
    const key = getStorageKey(path, options.baseDir);
    // Create a directory marker
    localStorage.setItem(`${key}/.dir`, '');
  }
}

