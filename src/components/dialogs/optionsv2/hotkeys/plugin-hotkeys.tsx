import React from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormField } from '@/components/ui/form';
import { pluginHost } from '@/plugins/host/manager';
import type { PluginHotkey } from '@/plugins/host/types';
import { useTranslation } from '@/i18n';
import { SettingsGroup, SettingsRow } from '../settings-ui';
import type { HotkeyBinding } from './conflicts';
import { HotkeyCapture, type HotkeyModifier } from './hotkey-capture';

/** One entry of pluginHost.commands(). */
export interface PluginCommand {
  pluginId: string;
  pluginName: string;
  id: string;
  title: string;
  hotkey: PluginHotkey | null;
}

/** Every plugin command as a hotkey binding ("Plugin name: command title"). */
export function pluginHotkeyBindings(commands: readonly PluginCommand[]): HotkeyBinding[] {
  return commands.map((command) => ({
    id: `plugin:${command.pluginId}:${command.id}`,
    label: `${command.pluginName}: ${command.title}`,
    modifier: command.hotkey?.modifier,
    key: command.hotkey?.key,
  }));
}

interface PluginHotkeysProps {
  commands: readonly PluginCommand[];
  /** Warning text for a binding (invalid key, Ctrl+C, clash with a core or plugin hotkey). */
  warningFor(binding: HotkeyBinding): string | null;
}

/** B6: the "Plugin commands" group of the Hotkeys settings; bindings persist in the plugin registry. */
export function PluginHotkeys({ commands, warningFor }: PluginHotkeysProps) {
  const { t } = useTranslation('plugins');
  // Only gives the rows their FormItem/FormControl wiring: values live in the plugin host.
  const form = useForm<Record<string, string>>();
  // Modifier picked on an unbound command, used once a key is pressed.
  const [pendingModifier, setPendingModifier] = React.useState<Record<string, HotkeyModifier>>({});
  if (commands.length === 0) return null;

  const bindings = pluginHotkeyBindings(commands);
  return (
    <Form {...form}>
      <SettingsGroup title={t('settings.hotkeys.group')}>
        {commands.map((command, index) => {
          const binding = bindings[index];
          const warning = warningFor(binding);
          const modifier = command.hotkey?.modifier ?? pendingModifier[binding.id] ?? 'ctrl';
          const setModifier = (next: HotkeyModifier) => {
            if (command.hotkey) pluginHost.setHotkey(command.pluginId, command.id, { modifier: next, key: command.hotkey.key });
            else setPendingModifier((prev) => ({ ...prev, [binding.id]: next }));
          };
          return (
            <FormField
              key={binding.id}
              control={form.control}
              name={`command${index}`}
              render={() => (
                <SettingsRow
                  label={command.title}
                  description={t('settings.hotkeys.from', { name: command.pluginName })}
                  control={
                    <>
                      <HotkeyCapture
                        actionLabel={binding.label}
                        modifier={modifier}
                        keyValue={command.hotkey?.key}
                        onModifierChange={setModifier}
                        onKeyChange={(key) =>
                          pluginHost.setHotkey(command.pluginId, command.id, key ? { modifier, key } : null)
                        }
                        clearable
                        warning={!!warning}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={!command.hotkey}
                        aria-label={t('settings.hotkeys.unbind', { action: binding.label })}
                        onClick={() => pluginHost.setHotkey(command.pluginId, command.id, null)}
                      >
                        <X aria-hidden
                          className="size-4" />
                      </Button>
                    </>
                  }
                >
                  {warning && (
                    <p role="status"
                      className="flex items-center gap-1.5 text-xs text-warning">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {warning}
                    </p>
                  )}
                </SettingsRow>
              )}
            />
          );
        })}
      </SettingsGroup>
    </Form>
  );
}
