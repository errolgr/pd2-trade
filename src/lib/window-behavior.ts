import type { ISettings } from '@/hooks/useOptions';
import type { OverlayBehavior } from '@/overlay';

/**
 * Settings → Interface → Windows & focus, read with the defaults the form shows (settings saved before these
 * existed, partial test settings).
 */
export function overlayBehavior(settings: ISettings): OverlayBehavior {
  return {
    keyboardFocus: settings.windowKeyboardFocus ?? 'typing',
    closeOnBlur: settings.windowsCloseOnClickAway ?? true,
    showOutsideGame: settings.windowsOutsideGame ?? false,
  };
}

/**
 * Hotkeys that don't copy an item stay registered outside the game. Only with windows shown there: a hotkey would
 * otherwise open a window nobody sees until the game is back.
 */
export function hotkeysWorkOutsideGame(settings: ISettings): boolean {
  return !!settings.windowsOutsideGame && !!settings.hotkeysOutsideGame;
}
