import React from 'react';
import { Plus } from 'lucide-react';
import { FormControl, Input, Tabs, TabsList, TabsTrigger, cn } from '@pd2-trader/ui';
import { hotkeyKeyFromEvent, hotkeyKeyLabel } from '@/lib/hotkey-keys';
import { useTranslation } from '@/i18n';

export type HotkeyModifier = 'ctrl' | 'alt';

interface HotkeyCaptureProps {
  /** The action's label, for the modifier toggle's accessible name. */
  actionLabel: string;
  modifier: HotkeyModifier;
  keyValue: string | undefined;
  onModifierChange(modifier: HotkeyModifier): void;
  onKeyChange(key: string): void;
  /** Backspace / Delete unbinds (the key may be empty). */
  clearable?: boolean;
  warning?: boolean;
}

/**
 * Modifier toggle + key capture of one hotkey row (core Hotkeys rows and plugin commands). Render inside a
 * SettingsRow under a FormField: the key input is the row's FormControl.
 */
export function HotkeyCapture({
  actionLabel,
  modifier,
  keyValue,
  onModifierChange,
  onKeyChange,
  clearable,
  warning,
}: HotkeyCaptureProps) {
  const { t } = useTranslation('settings');
  const label = hotkeyKeyLabel(keyValue);
  return (
    <>
      <Tabs value={modifier}>
        <TabsList className="h-8"
          aria-label={t('hotkeys.modifierLabel', { action: actionLabel })}>
          <TabsTrigger value="ctrl"
            className="px-2.5"
            onClick={() => onModifierChange('ctrl')}>
            Ctrl
          </TabsTrigger>
          <TabsTrigger value="alt"
            className="px-2.5"
            onClick={() => onModifierChange('alt')}>
            Alt
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Plus aria-hidden
        className="size-3.5 text-muted-foreground" />
      <FormControl>
        <Input
          type="text"
          readOnly
          placeholder={clearable ? t('hotkeys.off') : undefined}
          value={label}
          aria-invalid={warning ? true : undefined}
          className={cn(
            'h-9 w-11 rounded-md border-b-3 px-0 text-center font-mono text-sm font-semibold uppercase shadow-xs placeholder:text-3xs placeholder:font-normal',
            'focus-visible:border-b-primary',
            label.length > 1 && 'w-16 text-xs',
            warning && 'aria-invalid:border-warning/80 aria-invalid:ring-warning/30 dark:aria-invalid:ring-warning/30',
          )}
          // The key is recorded from the key press, not typed text: a Russian-layout press of
          // the [ key types 'х', which no global shortcut can be registered for
          onKeyDown={(e) => {
            if (clearable && (e.key === 'Backspace' || e.key === 'Delete')) {
              e.preventDefault();
              onKeyChange('');
              return;
            }
            const key = hotkeyKeyFromEvent(e);
            if (!key) return;
            e.preventDefault();
            onKeyChange(key);
          }}
        />
      </FormControl>
    </>
  );
}
