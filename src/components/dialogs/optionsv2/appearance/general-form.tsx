import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { emit } from '@/lib/browser-events';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SEASONS } from '@/lib/seasons';

const appearanceFormSchema = z.object({
  mode: z.enum(['softcore', 'hardcore'], {
    required_error: 'Please select a mode.',
  }),
  ladder: z.enum(['non-ladder', 'ladder'], {
    required_error: 'Please select a ladder.',
  }),
  fillStatValue: z.number().int().min(0).max(100).optional(),
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
      fillStatValue: settings?.fillStatValue ?? 5,
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
          fillStatValue: settings.fillStatValue ?? 5,
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
    return null;
  }

  return (
    <Form {...form}>
      <ScrollArea className="pr-2">
        <div className="flex flex-col gap-y-4 ">
          <FormField
            control={form.control}
            name="ladder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ladder</FormLabel>
                <FormControl>
                  <Select value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Ladder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ladder">Ladder</SelectItem>
                      <SelectItem value="non-ladder">Non-Ladder</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode</FormLabel>
                <FormControl>
                  <Select value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="softcore">Softcore</SelectItem>
                      <SelectItem value="hardcore">Hardcore</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Season</FormLabel>
            <FormControl>
              <Select
                value={settings.selectedSeasonId ?? 'current'}
                onValueChange={(value) => updateSettings({ selectedSeasonId: value })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Season" />
                </SelectTrigger>
                <SelectContent>
                  {SEASONS.map((season) => (
                    <SelectItem key={season.id}
                      value={season.id}>
                      {season.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormDescription>
              Filter price data by season. Past seasons require historical data to be available.
            </FormDescription>
          </FormItem>
          <FormField
            control={form.control}
            name="fillStatValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fill Stat Value (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5"
                    className="w-[200px]"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? undefined : parseInt(value, 10));
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>
                  Percentage used to automatically populate stat value ranges when selecting stats with ranges.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="diablo2Directory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diablo II Directory</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      placeholder="C:\Diablo II"
                      className="flex-1"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
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
                              emit('toast-event', {
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
                      Auto-Detect
                    </Button>
                  </div>
                </FormControl>
                <FormDescription>
                  {detectedDirectory && !field.value
                    ? `Detected: ${detectedDirectory}`
                    : 'Path to your Diablo II installation directory. Leave empty to auto-detect.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </ScrollArea>
    </Form>
  );
}
