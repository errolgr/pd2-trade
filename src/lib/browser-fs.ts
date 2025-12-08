/**
 * Browser-compatible file system utilities
 * Uses localStorage in browser, falls back to Tauri FS API in Tauri environment
 */

import { BaseDirectory } from '@tauri-apps/api/path';

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
  try {
    // Try Tauri API first
    const { readTextFile: tauriReadTextFile } = await import('@tauri-apps/plugin-fs');
    return await tauriReadTextFile(path, options as any);
  } catch {
    // Fallback to localStorage
    const key = getStorageKey(path, options.baseDir);
    const content = localStorage.getItem(key);
    if (content === null) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }
}

/**
 * Write text file
 */
export async function writeTextFile(
  path: string,
  contents: string,
  options: WriteTextFileOptions = {}
): Promise<void> {
  try {
    // Try Tauri API first
    const { writeTextFile: tauriWriteTextFile } = await import('@tauri-apps/plugin-fs');
    await tauriWriteTextFile(path, contents, options as any);
    return;
  } catch {
    // Fallback to localStorage
    const key = getStorageKey(path, options.baseDir);
    localStorage.setItem(key, contents);
  }
}

/**
 * Check if file/directory exists
 */
export async function exists(
  path: string,
  options: ExistsOptions = {}
): Promise<boolean> {
  try {
    // Try Tauri API first
    const { exists: tauriExists } = await import('@tauri-apps/plugin-fs');
    return await tauriExists(path, options as any);
  } catch {
    // Fallback to localStorage
    const key = getStorageKey(path, options.baseDir);
    return localStorage.getItem(key) !== null;
  }
}

/**
 * Create directory
 */
export async function mkdir(
  path: string,
  options: MkdirOptions = {}
): Promise<void> {
  try {
    // Try Tauri API first
    const { mkdir: tauriMkdir } = await import('@tauri-apps/plugin-fs');
    await tauriMkdir(path, options as any);
    return;
  } catch {
    // Fallback: directories are implicit in localStorage
    // We just ensure the path exists by creating a marker
    if (options.recursive) {
      const key = getStorageKey(path, options.baseDir);
      // Create a directory marker
      localStorage.setItem(`${key}/.dir`, '');
    }
  }
}

