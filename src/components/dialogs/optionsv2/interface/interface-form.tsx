import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';

const interfaceFormSchema = z.object({
  chatButtonOverlayEnabled: z.boolean().optional(),
});

type InterfaceFormValues = z.infer<typeof interfaceFormSchema>;

export function InterfaceForm() {
  const { settings, isLoading, updateSettings } = useOptions();

  const form = useForm<InterfaceFormValues>({
    resolver: zodResolver(interfaceFormSchema),
    defaultValues: {
      chatButtonOverlayEnabled: settings?.chatButtonOverlayEnabled ?? true,
    },
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) {
      form.reset(
        {
          chatButtonOverlayEnabled: settings.chatButtonOverlayEnabled ?? true,
        },
        { keepDirty: false },
      );
    }
  }, [settings, form]);

  // Auto-save on any change
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      const current = settingsRef.current;
      const changed = Object.entries(values).some(([key, val]) => current?.[key as keyof typeof current] !== val);
      if (changed) updateSettings(values);
    });
    return () => subscription.unsubscribe();
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return null;
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
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
      </div>
    </Form>
  );
}
