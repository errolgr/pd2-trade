import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getDiabloRectWithRetry } from '@/lib/window';
import { WindowLabels, WindowTitles } from '@/lib/window-titles';

/**
 * Creates/Ensures the Chat Button Overlay window exists and is positioned correctly.
 */
export async function createChatButtonWindow(
  chatButtonWindowRef: React.MutableRefObject<any>,
): Promise<WebviewWindow | null> {
  if (chatButtonWindowRef.current) return chatButtonWindowRef.current;

  const rect = await getDiabloRectWithRetry();

  // Check if rect is null (Diablo window not found after retries)
  if (!rect) {
    console.warn('[LandingPage] Diablo window rect not found after retries, cannot position chat button overlay');
    return null;
  }

  // Position button in bottom right corner - align bottom-right of button window with bottom-right of Diablo window
  const buttonSize = 240; // 48px button + padding + expanded radius
  const x = rect.x + rect.width - buttonSize - 20;
  const y = rect.y + rect.height - buttonSize - 10;

  const win = new WebviewWindow(WindowLabels.ChatButton, {
    url: '/chat-button',
    title: WindowTitles.ChatButton,
    x,
    y,
    width: buttonSize,
    height: buttonSize,
    decorations: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    shadow: false,
    focus: false,
    focusable: false,
    visible: true,
  });

  chatButtonWindowRef.current = win;
  return win;
}
