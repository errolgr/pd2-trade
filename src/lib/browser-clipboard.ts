/**
 * Browser-compatible clipboard utilities
 * Uses the Clipboard API when available, falls back to Tauri API in Tauri environment
 */

/**
 * Read text from clipboard
 */
export async function readText(): Promise<string | null> {
  try {
    // Try browser Clipboard API first
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
    
    // Fallback: try Tauri API if available
    const { readText: tauriReadText } = await import('@tauri-apps/plugin-clipboard-manager');
    return await tauriReadText();
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    return null;
  }
}

/**
 * Write text to clipboard
 */
export async function writeText(text: string): Promise<void> {
  try {
    // Try browser Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    
    // Fallback: try Tauri API if available
    const { writeText: tauriWriteText } = await import('@tauri-apps/plugin-clipboard-manager');
    await tauriWriteText(text);
  } catch (error) {
    console.error('Failed to write to clipboard:', error);
    throw error;
  }
}

