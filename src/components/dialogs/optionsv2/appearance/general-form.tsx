import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ChevronDown } from 'lucide-react';
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

  // Show a loading indicator until settings have loaded.
  if (isLoading || !settings) {
    return null;
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: settings,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(updateSettings)}
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
          className={'self-start cursor-pointer mt-2'}>
          Update preferences
        </Button>
      </form>
    </Form>
  );
}
