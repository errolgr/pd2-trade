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
import { DEFAULT_PRICE_WINDOW_HOURS, PRICE_WINDOW_OPTIONS } from '@/lib/price-window';
import { useTranslation } from '@/i18n';

const statsFormSchema = z.object({
  fillStatValue: z.number().int().min(0).max(100).optional(),
  statFillMarginUnit: z.enum(['percent', 'flat']).optional(),
  statFillLeaveMinEmpty: z.boolean().optional(),
  statFillLeaveMaxEmpty: z.boolean().optional(),
  statDefaultCorruptedFilter: z.enum(['both', 'corrupted', 'non-corrupted']).optional(),
  rareRankDisplay: z.enum(['bar', 'blocks']).optional(),
  priceWindowHours: z.union([z.literal(24), z.literal(72), z.literal(168), z.literal(720)]).optional(),
});

type StatsFormValues = z.infer<typeof statsFormSchema>;

export function StatsForm() {
  const { t } = useTranslation('settings');
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
      rareRankDisplay: settings?.rareRankDisplay ?? 'bar',
      priceWindowHours: settings?.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS,
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
          rareRankDisplay: settings.rareRankDisplay ?? 'bar',
          priceWindowHours: settings.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS,
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
        <SettingsGroup title={t('stats.prices.group')}>
          <FormField
            control={form.control}
            name="priceWindowHours"
            render={({ field }) => (
              <SettingsRow
                label={t('stats.priceWindow.label')}
                description={t('stats.priceWindow.description')}
                control={
                  <Select
                    value={String(field.value ?? DEFAULT_PRICE_WINDOW_HOURS)}
                    onValueChange={(value) => field.onChange(Number(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('stats.priceWindow.label')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRICE_WINDOW_OPTIONS.map((option) => (
                        <SelectItem key={option.hours}
                          value={String(option.hours)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title={t('stats.statRanges.group')}>
          <FormField
            control={form.control}
            name="fillStatValue"
            render={({ field }) => (
              <SettingsRow
                label={
                  marginUnit === 'percent' ? t('stats.fillStatValue.labelPercent') : t('stats.fillStatValue.labelFlat')
                }
                description={
                  marginUnit === 'percent'
                    ? t('stats.fillStatValue.descriptionPercent')
                    : t('stats.fillStatValue.descriptionFlat')
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
                label={t('stats.marginUnit.label')}
                description={t('stats.marginUnit.description')}
                control={
                  <Select value={field.value ?? 'percent'}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('stats.marginUnit.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percent">{t('stats.marginUnit.percent')}</SelectItem>
                      <SelectItem value="flat">{t('stats.marginUnit.flat')}</SelectItem>
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
                label={t('stats.leaveMinEmpty.label')}
                description={t('stats.leaveMinEmpty.description')}
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
                label={t('stats.leaveMaxEmpty.label')}
                description={t('stats.leaveMaxEmpty.description')}
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

        <SettingsGroup title={t('stats.filters.group')}>
          <FormField
            control={form.control}
            name="statDefaultCorruptedFilter"
            render={({ field }) => (
              <SettingsRow
                label={t('stats.corruptedFilter.label')}
                description={t('stats.corruptedFilter.description')}
                control={
                  <Select value={field.value ?? 'both'}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('stats.corruptedFilter.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="both">{t('stats.corruptedFilter.both')}</SelectItem>
                      <SelectItem value="corrupted">{t('stats.corruptedFilter.corrupted')}</SelectItem>
                      <SelectItem value="non-corrupted">{t('stats.corruptedFilter.nonCorrupted')}</SelectItem>
                    </SelectContent>
                  </Select>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title={t('stats.rareAppraisal.group')}>
          <FormField
            control={form.control}
            name="rareRankDisplay"
            render={({ field }) => (
              <SettingsRow
                label={t('stats.rankDisplay.label')}
                description={t('stats.rankDisplay.description')}
                control={
                  <Select value={field.value ?? 'bar'}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('stats.rankDisplay.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bar">{t('stats.rankDisplay.bar')}</SelectItem>
                      <SelectItem value="blocks">{t('stats.rankDisplay.blocks')}</SelectItem>
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
