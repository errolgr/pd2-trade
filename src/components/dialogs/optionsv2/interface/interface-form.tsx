import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { emit } from '@tauri-apps/api/event';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const interfaceFormSchema = z.object({
  chatButtonOverlayEnabled: z.boolean().optional(),
  windowTrackingEnabled: z.boolean().optional(),
});

type InterfaceFormValues = z.infer<typeof interfaceFormSchema>;

export function InterfaceForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [saving, setSaving] = React.useState(false);

  const form = useForm<InterfaceFormValues>({
    resolver: zodResolver(interfaceFormSchema),
    defaultValues: {
      chatButtonOverlayEnabled: settings?.chatButtonOverlayEnabled ?? true,
      windowTrackingEnabled: settings?.windowTrackingEnabled ?? true,
    },
  });

  // Reset form when settings change
  React.useEffect(() => {
    if (settings) {
      form.reset({
        chatButtonOverlayEnabled: settings.chatButtonOverlayEnabled ?? true,
        windowTrackingEnabled: settings.windowTrackingEnabled ?? true,
      });
    }
  }, [settings, form]);

  if (isLoading || !settings) {
    return null;
  }

  const onSubmit = async (values: InterfaceFormValues) => {
    setSaving(true);
    await updateSettings(values);
    await new Promise((resolve) => setTimeout(resolve, 200)); // artificial delay
    setSaving(false);
    emit('toast-event', 'Interface preferences saved!');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6">
        <FormField
          control={form.control}
          name="chatButtonOverlayEnabled"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center gap-2">
                <FormLabel>Chat Button Overlay</FormLabel>
                <FormControl>
                  <Switch checked={field.value ?? true}
                    onCheckedChange={field.onChange} />
                </FormControl>
              </div>
              <FormDescription>
                Show the floating chat button overlay in the bottom-right corner of the screen.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="windowTrackingEnabled"
          render={({ field }) => (
            <FormItem>
              <div className="flex flex-row items-center gap-2">
                <div className="flex items-center gap-2">
                  <FormLabel>Dynamic Window Tracking</FormLabel>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          When enabled, the PD2 Trader window will automatically follow the Diablo 2 window when you
                          move or resize it.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Switch checked={field.value ?? true}
                    onCheckedChange={field.onChange} />
                </FormControl>
              </div>
              <FormDescription>Automatically sync window position with Diablo 2.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit"
          className={'self-start cursor-pointer mt-2'}
          disabled={saving}>
          {saving ? <Loader2 className="animate-spin mr-2" /> : null}
          {saving ? 'Saving...' : 'Update interface preferences'}
        </Button>
      </form>
    </Form>
  );
}
