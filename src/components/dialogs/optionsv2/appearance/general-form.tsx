import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { FolderSearch, Wand2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getSeasonSettingOptions } from '@/lib/seasons';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';
import { showToast } from '@/overlay';

const appearanceFormSchema = z.object({
  mode: z.enum(['softcore', 'hardcore'], {
    required_error: 'Please select a mode.',
  }),
  ladder: z.enum(['non-ladder', 'ladder'], {
    required_error: 'Please select a ladder.',
  }),
  diablo2Directory: z.string().optional(),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function GeneralForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [detectedDirectory, setDetectedDirectory] = React.useState<string | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Always call hooks at the top level
  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      mode: settings?.mode || 'softcore',
      ladder: settings?.ladder || 'non-ladder',
      diablo2Directory: settings?.diablo2Directory || '',
    },
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) {
      form.reset(
        {
          mode: settings.mode || 'softcore',
          ladder: settings.ladder || 'non-ladder',
          diablo2Directory: settings.diablo2Directory || '',
        },
        { keepDirty: false },
      );
    }
  }, [settings, form]);

  // Auto-save on any change (debounced for text inputs)
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const current = settingsRef.current;
        const changed = Object.entries(values).some(
          ([key, val]) => JSON.stringify(current?.[key as keyof typeof current]) !== JSON.stringify(val),
        );
        if (changed) updateSettings(values);
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  // Auto-detect directory on mount
  React.useEffect(() => {
    if (isTauri() && !detectedDirectory) {
      invoke<string | null>('auto_detect_diablo2_directory')
        .then((dir) => {
          if (dir) {
            setDetectedDirectory(dir);
          }
        })
        .catch(console.error);
    }
  }, [detectedDirectory]);

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={4} />;
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <SettingsGroup title="Game">
          <FormField
            control={form.control}
            name="ladder"
            render={({ field }) => (
              <SettingsRow
                label="Ladder"
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Ladder" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ladder">Ladder</SelectItem>
                      <SelectItem value="non-ladder">Non-Ladder</SelectItem>
                    </SelectContent>
                  </Select>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <SettingsRow
                label="Mode"
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="softcore">Softcore</SelectItem>
                      <SelectItem value="hardcore">Hardcore</SelectItem>
                    </SelectContent>
                  </Select>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <SettingsRow
            label="Season"
            description="Filter price data by season. Past seasons require historical data to be available."
            control={
              <Select
                value={settings.selectedSeasonId ?? 'current'}
                onValueChange={(value) => updateSettings({ selectedSeasonId: value })}
              >
                <FormControl>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getSeasonSettingOptions().map((option) => (
                    <SelectItem key={option.value}
                      value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </SettingsGroup>

        <SettingsGroup title="Diablo II">
          <FormField
            control={form.control}
            name="diablo2Directory"
            render={({ field }) => (
              <SettingsRow
                layout="stacked"
                label="Diablo II Directory"
                description={
                  detectedDirectory && !field.value ? (
                    <span className="inline-flex items-center gap-1.5">
                      <FolderSearch className="size-3.5 text-success" />
                      {`Detected: ${detectedDirectory}`}
                    </span>
                  ) : (
                    'Path to your Diablo II installation directory. Leave empty to auto-detect.'
                  )
                }
                control={
                  <>
                    <FormControl>
                      <Input
                        placeholder="C:\Diablo II"
                        className="flex-1 font-mono text-[13px]"
                        spellCheck={false}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        if (isTauri()) {
                          try {
                            const detected = await invoke<string | null>('auto_detect_diablo2_directory');
                            if (detected) {
                              field.onChange(detected);
                              setDetectedDirectory(detected);
                            } else {
                              showToast({
                                title: 'Detection Failed',
                                description: 'Could not auto-detect Diablo II directory. Please enter it manually.',
                                variant: 'warning',
                              });
                            }
                          } catch (error) {
                            console.error('Failed to detect directory:', error);
                          }
                        }
                      }}
                    >
                      <Wand2 />
                      Auto-Detect
                    </Button>
                  </>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title="Troubleshooting">
          <SettingsRow
            label="Debug Logging"
            description="Write console output to a log file for troubleshooting."
            control={
              <FormControl>
                <Switch
                  checked={settings.debugLoggingEnabled ?? false}
                  onCheckedChange={(checked) => updateSettings({ debugLoggingEnabled: checked })}
                />
              </FormControl>
            }
          />
        </SettingsGroup>
      </div>
    </Form>
  );
}
