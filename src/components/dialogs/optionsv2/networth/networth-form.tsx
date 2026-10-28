import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ISettings, NetWorthTickerAnchor, useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsGroup, SettingsHint, SettingsLink, SettingsRow, SettingsSkeleton } from '../settings-ui';
import { PublicProfileGroup } from './public-profile';
import { Trans, useTranslation } from '@/i18n';

const AUTO_SNAPSHOT_OPTIONS = [
  { value: '0', labelKey: 'networth.autoSnapshotOptions.off' },
  { value: '5', labelKey: 'networth.autoSnapshotOptions.every5' },
  { value: '10', labelKey: 'networth.autoSnapshotOptions.every10' },
  { value: '15', labelKey: 'networth.autoSnapshotOptions.every15' },
  { value: '30', labelKey: 'networth.autoSnapshotOptions.every30' },
] as const;

/** Ticker positions (net worth ticker, corrupted zone timer). */
export const TICKER_ANCHOR_OPTIONS: { value: NetWorthTickerAnchor; labelKey: string }[] = [
  { value: 'top-left', labelKey: 'tickerAnchor.topLeft' },
  { value: 'top-center', labelKey: 'tickerAnchor.topCenter' },
  { value: 'top-right', labelKey: 'tickerAnchor.topRight' },
  { value: 'bottom-left', labelKey: 'tickerAnchor.bottomLeft' },
  { value: 'bottom-right', labelKey: 'tickerAnchor.bottomRight' },
  { value: 'above-chat', labelKey: 'tickerAnchor.aboveChat' },
  { value: 'custom', labelKey: 'tickerAnchor.custom' },
];

export const tickerAnchorSchema = z.enum([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-right',
  'above-chat',
  'custom',
]);

const netWorthFormSchema = z.object({
  netWorthTrackingEnabled: z.boolean(),
  netWorthAutoSnapshotMinutes: z.number().int().min(0),
  netWorthTickerEnabled: z.boolean(),
  netWorthTickerAnchor: tickerAnchorSchema,
  netWorthTickerOpacity: z.number().min(30).max(100),
  netWorthToastThresholdHr: z.number().min(0),
});

type NetWorthFormValues = z.infer<typeof netWorthFormSchema>;

function toFormValues(settings: ISettings | undefined): NetWorthFormValues {
  return {
    netWorthTrackingEnabled: settings?.netWorthTrackingEnabled !== false,
    netWorthAutoSnapshotMinutes: settings?.netWorthAutoSnapshotMinutes ?? 15,
    netWorthTickerEnabled: settings?.netWorthTickerEnabled ?? false,
    netWorthTickerAnchor: settings?.netWorthTickerAnchor ?? 'top-center',
    netWorthTickerOpacity: settings?.netWorthTickerOpacity ?? 90,
    netWorthToastThresholdHr: settings?.netWorthToastThresholdHr ?? 0.5,
  };
}

export function NetWorthForm() {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();
  const debounceRef = React.useRef<number | undefined>(undefined);

  const form = useForm<NetWorthFormValues>({
    resolver: zodResolver(netWorthFormSchema),
    defaultValues: toFormValues(settings),
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) {
      form.reset(toFormValues(settings), { keepDirty: false });
    }
  }, [settings, form]);

  // Auto-save on any change (debounced so slider drags and typing write once)
  const settingsRef = React.useRef(settings);
  React.useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  React.useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          const parsed = netWorthFormSchema.safeParse(values);
          if (!parsed.success) return;
          const current = settingsRef.current;
          const changed = Object.entries(parsed.data).some(
            ([key, val]) => current?.[key as keyof typeof current] !== val,
          );
          if (changed) updateSettings(parsed.data);
        }, 400);
      },
    });
    return () => {
      unsubscribe();
      window.clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={6} />;
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <SettingsGroup title={t('networth.history.group')}>
          <FormField
            control={form.control}
            name="netWorthTrackingEnabled"
            render={({ field }) => (
              <SettingsRow
                label={t('networth.history.tracking.label')}
                description={t('networth.history.tracking.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value}
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
            name="netWorthAutoSnapshotMinutes"
            render={({ field }) => (
              <SettingsRow
                label={t('networth.history.autoSnapshot.label')}
                description={t('networth.history.autoSnapshot.description')}
                control={
                  <Select value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('networth.history.autoSnapshot.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AUTO_SNAPSHOT_OPTIONS.map((option) => (
                        <SelectItem key={option.value}
                          value={option.value}>
                          {t(option.labelKey)}
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

        <PublicProfileGroup />

        <SettingsGroup title={t('networth.ticker.group')}>
          <FormField
            control={form.control}
            name="netWorthTickerEnabled"
            render={({ field }) => (
              <SettingsRow
                label={t('networth.ticker.enabled.label')}
                description={t('networth.ticker.enabled.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value}
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
            name="netWorthTickerAnchor"
            render={({ field }) => (
              <SettingsRow
                label={t('networth.ticker.position.label')}
                description={t('networth.ticker.position.description')}
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('networth.ticker.position.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TICKER_ANCHOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value}
                          value={option.value}>
                          {t(option.labelKey)}
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
          <FormField
            control={form.control}
            name="netWorthTickerOpacity"
            render={({ field }) => (
              <SettingsRow
                label={
                  <Trans
                    t={t}
                    i18nKey="networth.ticker.opacity"
                    values={{ value: field.value }}
                    components={{ num: <span className="tabular-nums" /> }}
                  />
                }
                control={
                  <div className="flex w-[220px] items-center gap-3">
                    <FormControl>
                      <Slider
                        className="flex-1"
                        min={30}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                    </FormControl>
                    <span
                      aria-hidden
                      title={t('networth.ticker.preview')}
                      style={{ opacity: field.value / 100 }}
                      className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-surface-foreground shadow-xs transition-opacity duration-(--dur-fast)"
                    >
                      <span className="text-q-gold">HR</span>
                    </span>
                  </div>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title={t('networth.toastThreshold.group')}>
          <FormField
            control={form.control}
            name="netWorthToastThresholdHr"
            render={({ field }) => (
              <SettingsRow
                label={t('networth.toastThreshold.label')}
                description={
                  <Trans
                    t={t}
                    i18nKey="networth.toastThreshold.description"
                    components={{ section: <SettingsLink to="Chat" /> }}
                  />
                }
                control={
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        className="w-[120px] tabular-nums"
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                      />
                    </FormControl>
                    <span className="text-xs font-medium text-muted-foreground">HR</span>
                  </div>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsHint>
          <Trans t={t}
            i18nKey="networth.hotkeyHint"
            components={{ section: <SettingsLink to="Hotkeys" /> }} />
        </SettingsHint>
      </div>
    </Form>
  );
}
