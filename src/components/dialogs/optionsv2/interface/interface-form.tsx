import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ISettings, useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { applyWindowTransparency, clampWindowTransparency, WINDOW_TRANSPARENCY_MAX } from '@/lib/themes';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';

const interfaceFormSchema = z.object({
  chatButtonOverlayEnabled: z.boolean().optional(),
  windowTransparency: z.number().min(0).max(WINDOW_TRANSPARENCY_MAX),
});

type InterfaceFormValues = z.infer<typeof interfaceFormSchema>;

function toFormValues(settings: ISettings | undefined): InterfaceFormValues {
  return {
    chatButtonOverlayEnabled: settings?.chatButtonOverlayEnabled ?? true,
    windowTransparency: clampWindowTransparency(settings?.windowTransparency),
  };
}

export function InterfaceForm() {
  const { settings, isLoading, updateSettings } = useOptions();

  const form = useForm<InterfaceFormValues>({
    resolver: zodResolver(interfaceFormSchema),
    defaultValues: toFormValues(settings),
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) {
      form.reset(toFormValues(settings), { keepDirty: false });
    }
  }, [settings, form]);

  // Auto-save on any change (debounced so a slider drag writes once)
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const debounceRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const current = toFormValues(settingsRef.current);
        const changed = Object.entries(values).some(([key, val]) => current[key as keyof InterfaceFormValues] !== val);
        if (changed) updateSettings(values);
      }, 300);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={2} />;
  }

  return (
    <Form {...form}>
      <SettingsGroup title="Overlays">
        <FormField
          control={form.control}
          name="chatButtonOverlayEnabled"
          render={({ field }) => (
            <SettingsRow
              label="Chat Button Overlay"
              description="Show the floating chat button overlay in the bottom-right corner of the screen."
              control={
                <FormControl>
                  <Switch checked={field.value ?? true}
                    onCheckedChange={field.onChange} />
                </FormControl>
              }
            >
              <FormMessage />
            </SettingsRow>
          )}
        />
        <FormField
          control={form.control}
          name="windowTransparency"
          render={({ field }) => (
            <SettingsRow
              label={
                <>
                  Window transparency: <span className="tabular-nums">{field.value}%</span>
                </>
              }
              description="See the game through window backgrounds. 0% is fully opaque."
              control={
                <FormControl>
                  <Slider
                    className="w-[220px]"
                    min={0}
                    max={WINDOW_TRANSPARENCY_MAX}
                    step={5}
                    value={[field.value]}
                    onValueChange={(value) => {
                      // Preview in this window right away; other windows follow once the setting is saved.
                      applyWindowTransparency(value[0]);
                      field.onChange(value[0]);
                    }}
                  />
                </FormControl>
              }
            >
              <FormMessage />
            </SettingsRow>
          )}
        />
      </SettingsGroup>
    </Form>
  );
}
