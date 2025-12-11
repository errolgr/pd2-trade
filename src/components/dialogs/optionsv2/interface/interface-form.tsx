import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { emit } from '@tauri-apps/api/event';

const interfaceFormSchema = z.object({
  chatButtonOverlayEnabled: z.boolean().optional(),
});

type InterfaceFormValues = z.infer<typeof interfaceFormSchema>;

export function InterfaceForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [saving, setSaving] = React.useState(false);

  const form = useForm<InterfaceFormValues>({
    resolver: zodResolver(interfaceFormSchema),
    defaultValues: {
      chatButtonOverlayEnabled: settings?.chatButtonOverlayEnabled ?? true,
    },
  });

  // Reset form when settings change
  React.useEffect(() => {
    if (settings) {
      form.reset({
        chatButtonOverlayEnabled: settings.chatButtonOverlayEnabled ?? true,
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
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
              <FormDescription>
                Show the floating chat button overlay in the bottom-right corner of the screen.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit"
          className={'self-start cursor-pointer mt-2'}
          disabled={saving}
        >
          {saving ? <Loader2 className="animate-spin mr-2" /> : null}
          {saving ? 'Saving...' : 'Update interface preferences'}
        </Button>
      </form>
    </Form>
  );
}

