import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { useOptions } from '@/hooks/useOptions';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

const statsFormSchema = z.object({
  fillStatValue: z.number().int().min(0).max(100).optional(),
  statFillMarginUnit: z.enum(['percent', 'flat']).optional(),
  statFillLeaveMinEmpty: z.boolean().optional(),
  statFillLeaveMaxEmpty: z.boolean().optional(),
  statDefaultCorruptedFilter: z.enum(['both', 'corrupted', 'non-corrupted']).optional(),
});

type StatsFormValues = z.infer<typeof statsFormSchema>;

export function StatsForm() {
  const { settings, isLoading, updateSettings } = useOptions();
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const form = useForm<StatsFormValues>({
    resolver: zodResolver(statsFormSchema),
    defaultValues: {
      fillStatValue: settings?.fillStatValue ?? 5,
      statFillMarginUnit: settings?.statFillMarginUnit ?? 'percent',
      statFillLeaveMinEmpty: settings?.statFillLeaveMinEmpty ?? false,
      statFillLeaveMaxEmpty: settings?.statFillLeaveMaxEmpty ?? false,
      statDefaultCorruptedFilter: settings?.statDefaultCorruptedFilter ?? 'both',
    },
  });

  React.useEffect(() => {
    if (settings) {
      form.reset(
        {
          fillStatValue: settings.fillStatValue ?? 5,
          statFillMarginUnit: settings.statFillMarginUnit ?? 'percent',
          statFillLeaveMinEmpty: settings.statFillLeaveMinEmpty ?? false,
          statFillLeaveMaxEmpty: settings.statFillLeaveMaxEmpty ?? false,
          statDefaultCorruptedFilter: settings.statDefaultCorruptedFilter ?? 'both',
        },
        { keepDirty: false },
      );
    }
  }, [settings, form]);

  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const current = settingsRef.current;
        const changed = Object.entries(values).some(
          ([key, val]) => JSON.stringify(current?.[key as keyof typeof current]) !== JSON.stringify(val),
        );
        if (changed) updateSettings(values);
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return null;
  }

  const marginUnit = form.watch('statFillMarginUnit') ?? 'percent';

  return (
    <Form {...form}>
      <ScrollArea className="pr-2">
        <div className="flex flex-col gap-y-4 ">
          <FormField
            control={form.control}
            name="fillStatValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fill Stat Value ({marginUnit === 'percent' ? '%' : 'flat'})</FormLabel>
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
                  {marginUnit === 'percent'
                    ? 'Percentage of the rolled value used as ± margin when filling stat ranges.'
                    : 'Flat amount applied as ± margin when filling stat ranges (e.g. 2 → ±2).'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statFillMarginUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Margin Unit</FormLabel>
                <FormControl>
                  <Select value={field.value ?? 'percent'}
                    onValueChange={field.onChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Margin unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  How the fill value above is interpreted. Flat is useful for low-roll stats like resists or +skills.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statFillLeaveMinEmpty"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Leave Min Empty</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                <FormDescription>
                  When filling a stat range, leave the minimum blank so searches match anything up to the maximum.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statFillLeaveMaxEmpty"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Leave Max Empty</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                <FormDescription>
                  When filling a stat range, leave the maximum blank so searches match the rolled value or better.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="statDefaultCorruptedFilter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Corrupted Filter</FormLabel>
                <FormControl>
                  <Select value={field.value ?? 'both'}
                    onValueChange={field.onChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Corrupted filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="corrupted">Corrupted only</SelectItem>
                      <SelectItem value="non-corrupted">Non-corrupted only</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  Initial corruption filter applied when opening price-check on a corruptable item.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </ScrollArea>
    </Form>
  );
}
