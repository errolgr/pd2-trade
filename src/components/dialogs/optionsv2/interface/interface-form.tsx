import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { ISettings, useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { applyWindowTransparency, clampWindowTransparency, WINDOW_TRANSPARENCY_MAX } from '@/lib/themes';
import { ZonePicker } from './zone-picker';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';
import { TICKER_ANCHOR_OPTIONS, tickerAnchorSchema } from '../networth/networth-form';

const ZONE_ALERT_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'all', label: 'Every rotation' },
  { value: 'followed', label: 'Only zones I follow' },
] as const;

const LIST_DIRECTION_OPTIONS = [
  { value: 'auto', label: 'Automatic' },
  { value: 'up', label: 'Upwards' },
  { value: 'down', label: 'Downwards' },
] as const;

const TIMER_ZONES_OPTIONS = [
  { value: 'all', label: 'Every zone' },
  { value: 'followed', label: 'Only zones I follow' },
] as const;

const interfaceFormSchema = z.object({
  chatButtonOverlayEnabled: z.boolean().optional(),
  windowTransparency: z.number().min(0).max(WINDOW_TRANSPARENCY_MAX),
  corruptedZoneTimerEnabled: z.boolean(),
  corruptedZoneTimerAnchor: tickerAnchorSchema,
  corruptedZoneTimerOpacity: z.number().min(30).max(100),
  corruptedZoneTimerListDirection: z.enum(['auto', 'up', 'down']),
  corruptedZoneTimerZones: z.enum(['all', 'followed']),
  corruptedZoneAlerts: z.enum(['off', 'all', 'followed']),
  corruptedZoneFollowed: z.array(z.string()),
});

type InterfaceFormValues = z.infer<typeof interfaceFormSchema>;

function toFormValues(settings: ISettings | undefined): InterfaceFormValues {
  return {
    chatButtonOverlayEnabled: settings?.chatButtonOverlayEnabled ?? true,
    windowTransparency: clampWindowTransparency(settings?.windowTransparency),
    corruptedZoneTimerEnabled: settings?.corruptedZoneTimerEnabled ?? false,
    corruptedZoneTimerAnchor: settings?.corruptedZoneTimerAnchor ?? 'top-right',
    corruptedZoneTimerOpacity: settings?.corruptedZoneTimerOpacity ?? 90,
    corruptedZoneTimerListDirection: settings?.corruptedZoneTimerListDirection ?? 'auto',
    corruptedZoneTimerZones: settings?.corruptedZoneTimerZones ?? 'all',
    corruptedZoneAlerts: settings?.corruptedZoneAlerts ?? 'off',
    corruptedZoneFollowed: settings?.corruptedZoneFollowed ?? [],
  };
}

export function InterfaceForm() {
  const { settings, isLoading, updateSettings } = useOptions();

  const form = useForm<InterfaceFormValues>({
    resolver: zodResolver(interfaceFormSchema),
    defaultValues: toFormValues(settings),
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) {
      form.reset(toFormValues(settings), { keepDirty: false });
    }
  }, [settings, form]);

  // Auto-save on any change (debounced so a slider drag writes once)
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const debounceRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const current = toFormValues(settingsRef.current);
        // JSON: the followed-zones array is a new array on every read
        const changed = Object.entries(values).some(
          ([key, val]) => JSON.stringify(current[key as keyof InterfaceFormValues]) !== JSON.stringify(val),
        );
        if (changed) updateSettings(values);
      }, 300);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={5} />;
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <SettingsGroup title="Overlays">
          <FormField
            control={form.control}
            name="chatButtonOverlayEnabled"
            render={({ field }) => (
              <SettingsRow
                label="Chat Button Overlay"
                description="Show the floating chat button overlay in the bottom-right corner of the screen."
                control={
                  <FormControl>
                    <Switch checked={field.value ?? true}
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
            name="windowTransparency"
            render={({ field }) => (
              <SettingsRow
                label={
                  <>
                    Window transparency: <span className="tabular-nums">{field.value}%</span>
                  </>
                }
                description="See the game through window backgrounds. 0% is fully opaque."
                control={
                  <FormControl>
                    <Slider
                      className="w-[220px]"
                      min={0}
                      max={WINDOW_TRANSPARENCY_MAX}
                      step={5}
                      value={[field.value]}
                      onValueChange={(value) => {
                        // Preview in this window right away; other windows follow once the setting is saved.
                        applyWindowTransparency(value[0]);
                        field.onChange(value[0]);
                      }}
                    />
                  </FormControl>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title="Corrupted zone timer">
          <FormField
            control={form.control}
            name="corruptedZoneTimerEnabled"
            render={({ field }) => (
              <SettingsRow
                label="Corrupted zone timer"
                description="Show which zones new Hell games corrupt and the time until the next rotation (every 15 minutes). Click it for the upcoming zones."
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
            name="corruptedZoneTimerAnchor"
            render={({ field }) => (
              <SettingsRow
                label="Timer position"
                description="Pin the timer to a corner of the game, or drag it anywhere on screen (switches to Custom)."
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
            name="corruptedZoneTimerListDirection"
            render={({ field }) => (
              <SettingsRow
                label="Schedule opens"
                description="Which way the upcoming zones open from the timer. Automatic opens upwards from a bottom corner, above the chat, or a timer dragged into the lower half of the screen."
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Direction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LIST_DIRECTION_OPTIONS.map((option) => (
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
            name="corruptedZoneTimerOpacity"
            render={({ field }) => (
              <SettingsRow
                label={
                  <>
                    Timer opacity: <span className="tabular-nums">{field.value}%</span>
                  </>
                }
                control={
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
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="corruptedZoneTimerZones"
            render={({ field }) => (
              <SettingsRow
                label="Timer shows"
                description="Every zone, or only the zones you follow: the timer then counts down to the next one and lists only those (every zone while you follow none)."
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Zones" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMER_ZONES_OPTIONS.map((option) => (
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
            name="corruptedZoneAlerts"
            render={({ field }) => (
              <SettingsRow
                label="Zone notifications"
                description="Pop up a toast when the corrupted zone changes: for every new zone, or only the zones you follow. Toasts follow the Toast Popups switch in Chat settings."
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Notifications" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ZONE_ALERT_OPTIONS.map((option) => (
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
          {(form.watch('corruptedZoneAlerts') === 'followed' ||
            form.watch('corruptedZoneTimerZones') === 'followed') && (
            <FormField
              control={form.control}
              name="corruptedZoneFollowed"
              render={({ field }) => (
                <SettingsRow
                  label="Followed zones"
                  description="The zones the timer and notifications follow when set to Only zones I follow."
                  control={<ZonePicker value={field.value}
                    onChange={field.onChange} />}
                />
              )}
            />
          )}
        </SettingsGroup>
      </div>
    </Form>
  );
}
