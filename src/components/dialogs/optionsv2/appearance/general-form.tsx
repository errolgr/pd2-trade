import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOptions } from '@/hooks/useOptions';

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
        className="flex flex-col gap-y-8">
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
                      value="ladder">
                      Non-Ladder
                    </option>
                    <option key={"non-ladder"}
                      value="non-ladder">
                      Ladder
                    </option>
                  </select>
                </FormControl>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
              </div>
              <FormDescription>Set if your character is ladder or non-ladder.</FormDescription>
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
              <FormDescription>Set if your character is hardcore or softcore</FormDescription>
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
