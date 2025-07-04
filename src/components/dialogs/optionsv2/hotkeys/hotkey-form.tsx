import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOptions } from '@/hooks/useOptions';
import { emit } from '@tauri-apps/api/event';
import { Loader2 } from 'lucide-react';

const hotkeyFormSchema = z.object({
  hotkeyModifier: z.enum(['ctrl', 'alt']),
  hotkeyKey: z
    .string()
    .min(1, 'Enter a key')
    .max(1, 'Only one character allowed')
    .regex(/^[a-z0-9]$/i, 'Must be a letter or number'),
  hotkeyModifierListItem: z.enum(['ctrl', 'alt']),
  hotkeyKeyListItem: z
    .string()
    .min(1, 'Enter a key')
    .max(1, 'Only one character allowed')
    .regex(/^[a-z0-9]$/i, 'Must be a letter or number'),
  hotkeyModifierSettings: z.enum(['ctrl', 'alt']),
  hotkeyKeySettings: z
    .string()
    .min(1, 'Enter a key')
    .max(1, 'Only one character allowed')
    .regex(/^[a-z0-9]$/i, 'Must be a letter or number'),
  hotkeyModifierCurrencyValuation: z.enum(['ctrl', 'alt']),
  hotkeyKeyCurrencyValuation: z
    .string()
    .min(1, 'Enter a key')
    .max(1, 'Only one character allowed')
    .regex(/^[a-z0-9]$/i, 'Must be a letter or number'),
}).refine(
  (data) => !(data.hotkeyModifier === 'ctrl' && data.hotkeyKey?.toLowerCase() === 'c'),
  {
    message: 'Ctrl + C is not allowed (reserved system shortcut).',
    path: ['hotkeyKey'],
  }
);

type HotkeyFormValues = z.infer<typeof hotkeyFormSchema>;

export function HotkeyForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [saving, setSaving] = React.useState(false);

  const form = useForm<HotkeyFormValues>({
    resolver: zodResolver(hotkeyFormSchema),
    defaultValues: (settings as HotkeyFormValues) || {
      hotkeyModifier: 'ctrl',
      hotkeyKey: '',
      hotkeyModifierListItem: 'ctrl',
      hotkeyKeyListItem: '',
      hotkeyModifierSettings: 'ctrl',
      hotkeyKeySettings: '',
      hotkeyModifierCurrencyValuation: 'ctrl',
      hotkeyKeyCurrencyValuation: '',
    },
  });

  React.useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings]);

  if (isLoading || !settings) {
    return null;
  }

  const onSubmit = async (values: HotkeyFormValues) => {
    setSaving(true);
    await updateSettings(values);
    await new Promise((resolve) => setTimeout(resolve, 200)); // artificial delay
    setSaving(false);
    emit('toast-event', 'Hotkey preferences saved!');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-y-2">
        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="hotkeyModifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1 block">Price check</FormLabel>
                <FormControl>
                  <Tabs defaultValue={'ctrl'} value={field.value}>
                    <TabsList>
                      <TabsTrigger value={'ctrl'} onClick={() => field.onChange('ctrl')}>Ctrl</TabsTrigger>
                      <TabsTrigger value={'alt'} onClick={() => field.onChange('alt')}>Alt</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hotkeyKey"
            render={({ field }) => (
              <FormItem className={'flex flex-row gap-4 items-center'}>
                <div>+</div>
                <FormControl>
                  <Input
                    type="text"
                    maxLength={1}
                    value={field.value?.toUpperCase()}
                    className="w-12 text-center"
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="hotkeyModifierListItem"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1 block">List item</FormLabel>
                <FormControl>
                  <Tabs defaultValue={'ctrl'} value={field.value}>
                    <TabsList>
                      <TabsTrigger value={'ctrl'} onClick={() => field.onChange('ctrl')}>Ctrl</TabsTrigger>
                      <TabsTrigger value={'alt'} onClick={() => field.onChange('alt')}>Alt</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hotkeyKeyListItem"
            render={({ field }) => (
              <FormItem className={'flex flex-row gap-4 items-center'}>
                <div>+</div>
                <FormControl>
                  <Input
                    type="text"
                    maxLength={1}
                    value={field.value?.toUpperCase()}
                    className="w-12 text-center"
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-end gap-2 mt-4">
          <FormField
            control={form.control}
            name="hotkeyModifierSettings"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1 block">Open Settings</FormLabel>
                <FormControl>
                  <Tabs defaultValue={'ctrl'} value={field.value}>
                    <TabsList>
                      <TabsTrigger value={'ctrl'} onClick={() => field.onChange('ctrl')}>Ctrl</TabsTrigger>
                      <TabsTrigger value={'alt'} onClick={() => field.onChange('alt')}>Alt</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hotkeyKeySettings"
            render={({ field }) => (
              <FormItem className={'flex flex-row gap-4 items-center'}>
                <div>+</div>
                <FormControl>
                  <Input
                    type="text"
                    maxLength={1}
                    value={field.value?.toUpperCase()}
                    className="w-12 text-center"
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex items-end gap-2 mt-4">
          <FormField
            control={form.control}
            name="hotkeyModifierCurrencyValuation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1 block">Currency</FormLabel>
                <FormControl>
                  <Tabs defaultValue={'ctrl'} value={field.value}>
                    <TabsList>
                      <TabsTrigger value={'ctrl'} onClick={() => field.onChange('ctrl')}>Ctrl</TabsTrigger>
                      <TabsTrigger value={'alt'} onClick={() => field.onChange('alt')}>Alt</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="hotkeyKeyCurrencyValuation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center">
                <div>+</div>
                <FormControl>
                  <Input
                    type="text"
                    maxLength={1}
                    value={field.value?.toUpperCase()}
                    className="w-12 text-center"
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className={'self-start cursor-pointer mt-2'} disabled={saving}>
          {saving ? <Loader2 className="animate-spin mr-2" /> : null}
          {saving ? 'Saving...' : 'Update hotkey preferences'}
        </Button>
      </form>
    </Form>
  );
} 