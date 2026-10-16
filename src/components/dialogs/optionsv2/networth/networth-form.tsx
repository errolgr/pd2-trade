import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ISettings, useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const AUTO_SNAPSHOT_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '5', label: 'Every 5 minutes' },
  { value: '10', label: 'Every 10 minutes' },
  { value: '15', label: 'Every 15 minutes' },
  { value: '30', label: 'Every 30 minutes' },
];

const ANCHOR_OPTIONS: { value: NonNullable<ISettings['netWorthTickerAnchor']>; label: string }[] = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'above-chat', label: 'Above chat button' },
];

const netWorthFormSchema = z.object({
  netWorthTrackingEnabled: z.boolean().optional(),
  netWorthAutoSnapshotMinutes: z.number().int().min(0),
  netWorthTickerEnabled: z.boolean(),
  netWorthTickerAnchor: z.enum(['top-left', 'top-center', 'top-right', 'above-chat']),
  netWorthTickerOpacity: z.number().min(30).max(100),
  netWorthToastThresholdHr: z.number().min(0),
});

type NetWorthFormValues = z.infer<typeof netWorthFormSchema>;

function toFormValues(settings: ISettings | undefined): NetWorthFormValues {
  return {
    netWorthTrackingEnabled: settings?.netWorthTrackingEnabled,
    netWorthAutoSnapshotMinutes: settings?.netWorthAutoSnapshotMinutes ?? 15,
    netWorthTickerEnabled: settings?.netWorthTickerEnabled ?? true,
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
    return null;
  }

  return (
    <Form {...form}>
      <ScrollArea className="pr-2">
        <div className="flex flex-col gap-y-6">
          <FormField
            control={form.control}
            name="netWorthTrackingEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Save net worth history</FormLabel>
                  <FormControl>
                    <Switch checked={field.value === true}
                      onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                <FormDescription>
                  Store snapshots of your stash value on pd2trader.com so you can see history and sessions. When off,
                  values are still calculated but nothing is saved.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="netWorthAutoSnapshotMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Automatic snapshots</FormLabel>
                <FormControl>
                  <Select value={String(field.value)}
                    onValueChange={(value) => field.onChange(Number(value))}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTO_SNAPSHOT_OPTIONS.map((option) => (
                        <SelectItem key={option.value}
                          value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>Take a snapshot on this interval while Diablo II is focused.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="netWorthTickerEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Net worth ticker</FormLabel>
                  <FormControl>
                    <Switch checked={field.value}
                      onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                <FormDescription>
                  Show your stash value, session change and HR per hour over the game. Click it for details.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="netWorthTickerAnchor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticker position</FormLabel>
                <FormControl>
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANCHOR_OPTIONS.map((option) => (
                        <SelectItem key={option.value}
                          value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="netWorthTickerOpacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticker opacity: {field.value}%</FormLabel>
                <FormControl>
                  <Slider
                    className="w-[220px]"
                    min={30}
                    max={100}
                    step={5}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="netWorthToastThresholdHr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Snapshot toast threshold (HR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    className="w-[120px]"
                    value={Number.isFinite(field.value) ? field.value : ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Show a toast when a snapshot changes your net worth by at least this much. Toggle the Net Worth toast
                  type under Chat settings.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-sm text-muted-foreground">The snapshot hotkey is configured under Hotkeys.</p>
        </div>
      </ScrollArea>
    </Form>
  );
}
