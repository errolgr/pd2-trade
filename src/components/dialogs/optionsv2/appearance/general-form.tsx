import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ChevronDown, Loader2, TriangleAlert } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOptions } from '@/hooks/useOptions';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { emit } from '@/lib/browser-events';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [saving, setSaving] = React.useState(false);
  const [detectedDirectory, setDetectedDirectory] = React.useState<string | null>(null);

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

  // Reset form when settings change
  React.useEffect(() => {
    if (settings) {
      form.reset({
        mode: settings.mode || 'softcore',
        ladder: settings.ladder || 'non-ladder',
        fillStatValue: settings.fillStatValue ?? 5,
        diablo2Directory: settings.diablo2Directory || '',
      });
    }
  }, [settings, form]);

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

  const onSubmit = async (values: AppearanceFormValues) => {
    setSaving(true);
    await updateSettings(values);
    await new Promise((resolve) => setTimeout(resolve, 200)); // artificial delay
    setSaving(false);
    await emit('toast-event', { title: 'PD2 Trader', description: 'Preferences saved!' });
  };

  return (
    <Form {...form}>
      <ScrollArea className="pr-2">
        <form onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-y-4 max-h-[330px]">

          {navigator.userAgent.includes("Linux") && (
            <Alert variant="destructive">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>Linux Compatibility Warning</AlertTitle>
              <AlertDescription>
                Global hotkeys (like Ctrl+C) are always active on Linux. Please be careful when using other applications while PD2 Trader is running.
              </AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="ladder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ladder</FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
        </form>
      </ScrollArea>
      <Button type="submit"
        className={'self-start cursor-pointer mt-2'}
        disabled={saving}
        onClick={form.handleSubmit(onSubmit)}
      >
        {saving ? <Loader2 className="animate-spin mr-2" /> : null}
        {saving ? 'Saving...' : 'Update preferences'}
      </Button>
    </Form>
  );
}
