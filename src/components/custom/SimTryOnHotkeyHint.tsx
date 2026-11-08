import { Keyboard } from 'lucide-react';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { cn } from '@/lib/utils';
import { useOverlay } from '@/overlay';
import { formatHotkey } from '@/pages/palette/lib/hotkey';

/** The try-on hotkey's keycap text ('Ctrl+J'); null while unbound. */
export function simTryOnHotkey(settings: Pick<ISettings, 'hotkeyModifierSimTryOn' | 'hotkeyKeySimTryOn'>) {
  return formatHotkey(settings.hotkeyModifierSimTryOn, settings.hotkeyKeySimTryOn);
}

/** 'Try-on hotkey: Ctrl+J', or 'Try-on hotkey: not set'. */
export function simTryOnHotkeyText(settings: Pick<ISettings, 'hotkeyModifierSimTryOn' | 'hotkeyKeySimTryOn'>) {
  return `Try-on hotkey: ${simTryOnHotkey(settings) ?? 'not set'}`;
}

/**
 * The Horadric Sim try-on hotkey's binding, as a link to its row in Settings → Hotkeys (to bind or change it).
 * `onOpen` runs after Settings opened (e.g. to close the popover it sits in).
 */
export function SimTryOnHotkeyHint({ onOpen, className }: { onOpen?: () => void; className?: string }) {
  const { settings } = useOptions();
  const { openPanel } = useOverlay();
  const bound = simTryOnHotkey(settings) !== null;
  return (
    <button
      type="button"
      onClick={() => {
        openPanel('settings', { section: 'Hotkeys', field: 'hotkeyKeySimTryOn' });
        onOpen?.();
      }}
      title={bound ? 'Change the try-on hotkey' : 'Set a hotkey that tries the hovered item on your character'}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline',
        className,
      )}
    >
      <Keyboard className="size-3.5 shrink-0" />
      {simTryOnHotkeyText(settings)}
    </button>
  );
}
