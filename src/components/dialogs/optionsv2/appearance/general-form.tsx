import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOptions } from '@/hooks/useOptions';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
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
import { emit } from '@tauri-apps/api/event';

const appearanceFormSchema = z.object({
  mode: z.enum(['softcore', 'hardcore'], {
    required_error: 'Please select a mode.',
  }),
  ladder: z.enum(['non-ladder', 'ladder'], {
    required_error: 'Please select a ladder.',
  }),
  fillStatValue: z.number().int().min(0).max(100).optional(),
  pd2InstallDir: z.string().optional(),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function GeneralForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [saving, setSaving] = React.useState(false);

  // Always call hooks at the top level
  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      mode: settings?.mode || 'softcore',
      ladder: settings?.ladder || 'non-ladder',
      fillStatValue: settings?.fillStatValue ?? 5,
      pd2InstallDir: settings?.pd2InstallDir || '',
    },
  });

  // Reset form when settings change
  React.useEffect(() => {
    if (settings) {
      form.reset({
        mode: settings.mode || 'softcore',
        ladder: settings.ladder || 'non-ladder',
        fillStatValue: settings.fillStatValue ?? 5,
        pd2InstallDir: settings.pd2InstallDir || '',
      });
    }
  }, [settings, form]);

  if (isLoading || !settings) {
    return null;
  }

  const onSubmit = async (values: AppearanceFormValues) => {
    setSaving(true);
    await updateSettings(values);
    await new Promise((resolve) => setTimeout(resolve, 200)); // artificial delay
    setSaving(false);
    emit('toast-event', 'Preferences saved!');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-y-4">
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
          name="pd2InstallDir"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Diablo 2 Installation Directory</FormLabel>
              <FormControl>
                <Input
                  placeholder="/path/to/ProjectD2"
                  className="w-full"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Directory containing d2gl.json (usually the ProjectD2 folder).
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
          {saving ? 'Saving...' : 'Update preferences'}
        </Button>
      </form>
    </Form>
  );
}
