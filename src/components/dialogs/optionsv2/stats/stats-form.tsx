import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { useOptions } from '@/hooks/useOptions';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';

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
    return <SettingsSkeleton rows={5} />;
  }

  const marginUnit = form.watch('statFillMarginUnit') ?? 'percent';

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <SettingsGroup title="Stat ranges">
          <FormField
            control={form.control}
            name="fillStatValue"
            render={({ field }) => (
              <SettingsRow
                label={`Fill Stat Value (${marginUnit === 'percent' ? '%' : 'flat'})`}
                description={
                  marginUnit === 'percent'
                    ? 'Percentage of the rolled value used as ± margin when filling stat ranges.'
                    : 'Flat amount applied as ± margin when filling stat ranges (e.g. 2 → ±2).'
                }
                control={
                  <div className="flex w-[220px] items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        className="flex-1 tabular-nums"
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
                    <span
                      aria-hidden
                      className="w-8 shrink-0 rounded-md bg-muted px-1.5 py-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      {marginUnit === 'percent' ? '±%' : '±'}
                    </span>
                  </div>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="statFillMarginUnit"
            render={({ field }) => (
              <SettingsRow
                label="Margin Unit"
                description="How the fill value above is interpreted. Flat is useful for low-roll stats like resists or +skills."
                control={
                  <Select value={field.value ?? 'percent'}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Margin unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="flat">Flat</SelectItem>
                    </SelectContent>
                  </Select>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="statFillLeaveMinEmpty"
            render={({ field }) => (
              <SettingsRow
                label="Leave Min Empty"
                description="When filling a stat range, leave the minimum blank so searches match anything up to the maximum."
                control={
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange} />
                  </FormControl>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="statFillLeaveMaxEmpty"
            render={({ field }) => (
              <SettingsRow
                label="Leave Max Empty"
                description="When filling a stat range, leave the maximum blank so searches match the rolled value or better."
                control={
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange} />
                  </FormControl>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title="Filters">
          <FormField
            control={form.control}
            name="statDefaultCorruptedFilter"
            render={({ field }) => (
              <SettingsRow
                label="Default Corrupted Filter"
                description="Initial corruption filter applied when opening price-check on a corruptable item."
                control={
                  <Select value={field.value ?? 'both'}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Corrupted filter" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="corrupted">Corrupted only</SelectItem>
                      <SelectItem value="non-corrupted">Non-corrupted only</SelectItem>
                    </SelectContent>
                  </Select>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>
      </div>
    </Form>
  );
}
