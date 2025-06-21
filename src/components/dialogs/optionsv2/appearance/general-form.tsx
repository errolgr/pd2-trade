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

const appearanceFormSchema = z.object({
  mode: z.enum(['softcore', 'hardcore'], {
    required_error: 'Please select a mode.',
  }),
  hotkeyModifier: z.enum(['ctrl', 'alt']),
  hotkeyKey: z
    .string()
    .min(1, 'Enter a key')
    .max(1, 'Only one character allowed')
    .regex(/^[a-z0-9]$/i, 'Must be a letter or number'),
  ladder: z.enum(['non-ladder', 'ladder'], {
    required_error: 'Please select a ladder.',
  }),
}).refine(
  (data) => !(data.hotkeyModifier === 'ctrl' && data.hotkeyKey?.toLowerCase() === 'c'),
  {
    message: 'Ctrl + C is not allowed (reserved system shortcut).',
    path: ['hotkeyKey'],
  }
);

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
        <div className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="hotkeyModifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="mb-1 block">Price check</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(val) => val && field.onChange(val)}
                    className="flex gap-2"
                  >
                    <ToggleGroupItem value="ctrl"
                      className="px-4">
                      Ctrl
                    </ToggleGroupItem>
                    <ToggleGroupItem value="alt"
                      className="px-4">
                      Alt
                    </ToggleGroupItem>
                  </ToggleGroup>
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
                <div>
                  +
                </div>
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
        <FormField
          control={form.control}
          name="ladder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ladder</FormLabel>
              <div className="relative w-max">
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal cursor-pointer',
                    )}
                    {...field}
                  >
                    <option key={"ladder"}
                      value="non-ladder">
                      Non-Ladder
                    </option>
                    <option key={"non-ladder"}
                      value="ladder">
                      Ladder
                    </option>
                  </select>
                </FormControl>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
              </div>
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
              <div className="relative w-max">
                <FormControl>
                  <select
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal cursor-pointer',
                    )}
                    {...field}
                  >
                    <option key={"softcore"}
                      value="softcore">
                      Softcore
                    </option>
                    <option key={"hardcore"}
                      value="hardcore">
                      Hardcore
                    </option>
                  </select>
                </FormControl>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit"
          className={'self-start cursor-pointer'}>
          Update preferences
        </Button>
      </form>
    </Form>
  );
}
