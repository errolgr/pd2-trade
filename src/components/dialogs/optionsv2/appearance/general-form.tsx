import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOptions } from '@/hooks/useOptions';
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Input} from "@/components/ui/input";
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
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function GeneralForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const [saving, setSaving] = React.useState(false);

  // Always call hooks at the top level
  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: settings || {
      mode: 'softcore',
      ladder: 'non-ladder',
    },
  });

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
