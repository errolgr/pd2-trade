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

const AUTO_SNAPSHOT_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '10', label: 'Every 10 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
];

/** Ticker positions (net worth ticker, corrupted zone timer). */
export const TICKER_ANCHOR_OPTIONS: { value: NetWorthTickerAnchor; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'above-chat', label: 'Above chat button' },
  { value: 'custom', label: 'Custom (drag to move)' },
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
        <SettingsGroup title="History">
          <FormField
            control={form.control}
            name="netWorthTrackingEnabled"
            render={({ field }) => (
              <SettingsRow
                label="Save net worth history"
                description="Store snapshots of your net worth on pd2trader.com so you can see history and sessions. When off, values are still calculated but nothing is saved."
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
                label="Automatic snapshots"
                description="Take a snapshot on this interval while Diablo II is focused."
                control={
                  <Select value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AUTO_SNAPSHOT_OPTIONS.map((option) => (
                        <SelectItem key={option.value}
                          value={option.value}>
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

        <PublicProfileGroup />

        <SettingsGroup title="Ticker overlay">
          <FormField
            control={form.control}
            name="netWorthTickerEnabled"
            render={({ field }) => (
              <SettingsRow
                label="Net worth ticker"
                description="Show your net worth, session change and HR per hour over the game. Click it for details."
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
                label="Ticker position"
                description="Pin the ticker to a corner of the game, or drag it anywhere on screen (switches to Custom)."
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TICKER_ANCHOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value}
                          value={option.value}>
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
          <FormField
            control={form.control}
            name="netWorthTickerOpacity"
            render={({ field }) => (
              <SettingsRow
                label={
                  <>
                    Ticker opacity: <span className="tabular-nums">{field.value}%</span>
                  </>
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
                      title="Preview"
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

        <SettingsGroup title="Notifications">
          <FormField
            control={form.control}
            name="netWorthToastThresholdHr"
            render={({ field }) => (
              <SettingsRow
                label="Snapshot toast threshold (HR)"
                description={
                  <>
                    While the ticker is on, show a toast when a snapshot changes your net worth by at least this much.
                    Toggle the Net Worth toast type under <SettingsLink to="Chat">Chat settings</SettingsLink>.
                  </>
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
          The snapshot hotkey is configured under <SettingsLink to="Hotkeys">Hotkeys</SettingsLink>.
        </SettingsHint>
      </div>
    </Form>
  );
}
