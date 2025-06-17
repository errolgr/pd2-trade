import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useOptions } from '@/hooks/useOptions';

const fonts = [
  { value: 'sans', label: 'Sans', css: 'sans-serif' },
  { value: 'mono', label: 'Mono', css: 'monospace' },
  { value: 'inter', label: 'Inter', css: 'Inter, sans-serif' },
  { value: 'Manrope', label: 'Manrope', css: 'Manrope, sans-serif' },
  { value: 'system-ui', label: 'System', css: 'system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins', css: "'Poppins', sans-serif" },
  { value: 'orbitron', label: 'Orbitron', css: 'Orbitron, sans-serif' },
  { value: 'audiowide', label: 'Audiowide', css: 'Audiowide, cursive' },
  { value: 'vt323', label: 'VT323', css: 'VT323, monospace' },
  { value: 'Bebas Neue', label: 'Bebas Neue', css: 'Bebas Neue, sans-serif' },
];

const appearanceFormSchema = z.object({
  theme: z.enum(['light', 'dark'], {
    required_error: 'Please select a theme.',
  }),
  font: z.enum(
    [
      'sans',
      'mono',
      'inter',
      'Manrope',
      'poppins',
      'system-ui',
      'Press Start 2P',
      'orbitron',
      'audiowide',
      'vt323',
      'Bebas Neue',
    ],
    {
      invalid_type_error: 'Select a font',
      required_error: 'Please select a font.',
    },
  ),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function AppearanceForm() {
  const { settings, isLoading, updateSettings } = useOptions();

  // Show a loading indicator until settings have loaded.
  if (isLoading || !settings) {
    return null;
  }

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: settings,
  });

  const renderFontOptions = (fonts) =>
    fonts.map((font) => (
      <option key={font.value}
        value={font.value}
        style={{ fontFamily: font.css }}>
        {font.label}
      </option>
    ));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(updateSettings)}
        className="flex flex-col gap-y-8">
        <FormField
          control={form.control}
          name="font"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Font</FormLabel>
              <div className="relative w-max">
                <FormControl>
                  <select
                    style={{ fontFamily: fonts.find((f) => f.value === field.value)?.css }}
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-[200px] appearance-none font-normal cursor-pointer',
                    )}
                    {...field}
                  >
                    {renderFontOptions(fonts)}
                  </select>
                </FormControl>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
              </div>
              <FormDescription>Set the font you want to use in the dashboard.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>Theme</FormLabel>
              <FormDescription>Select the theme for the Panth meter.</FormDescription>
              <FormMessage />
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="grid max-w-md grid-cols-2 gap-8 pt-2"
              >
                <FormItem>
                  <FormLabel className="flex flex-col [&:has([data-state=checked])>div]:border-primary items-stretch cursor-pointer">
                    <FormControl>
                      <RadioGroupItem value="light"
                        className="sr-only cursor-pointer" />
                    </FormControl>
                    <div className="rounded-md border-2 border-muted p-1 hover:border-accent">
                      <div className="flex flex-col gap-y-2 rounded-sm bg-[#ecedef] p-2">
                        <div className="flex flex-col gap-y-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                        <div className="flex gap-x-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                        <div className="flex gap-x-2 rounded-md bg-white p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                        </div>
                      </div>
                    </div>
                    <span className="block w-full p-2 text-center font-medium">Light</span>
                  </FormLabel>
                </FormItem>
                <FormItem>
                  <FormLabel className="flex flex-col [&:has([data-state=checked])>div]:border-primary items-stretch cursor-pointer">
                    <FormControl>
                      <RadioGroupItem value="dark"
                        className="sr-only" />
                    </FormControl>
                    <div className="rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
                      <div className="flex flex-col gap-y-2 rounded-sm bg-slate-950 p-2 justify-start">
                        <div className="flex flex-col gap-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                        <div className="flex gap-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                        <div className="flex gap-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                          <div className="h-4 w-4 rounded-full bg-slate-400" />
                          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                        </div>
                      </div>
                    </div>
                    <span className="block w-full p-2 text-center font-medium">Dark</span>
                  </FormLabel>
                </FormItem>
              </RadioGroup>
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
