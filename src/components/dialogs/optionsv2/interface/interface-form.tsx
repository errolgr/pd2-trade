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
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, Trans, useTranslation } from '@/i18n';

const ZONE_ALERT_OPTIONS = [
  { value: 'off', labelKey: 'interface.zoneAlertOptions.off' },
  { value: 'all', labelKey: 'interface.zoneAlertOptions.all' },
  { value: 'followed', labelKey: 'interface.zoneAlertOptions.followed' },
] as const;

const TIMER_ZONES_OPTIONS = [
  { value: 'all', labelKey: 'interface.timerZonesOptions.all' },
  { value: 'followed', labelKey: 'interface.timerZonesOptions.followed' },
] as const;

const TIMER_LAYOUT_OPTIONS = [
  { value: 'horizontal', labelKey: 'interface.timerLayoutOptions.horizontal' },
  { value: 'vertical', labelKey: 'interface.timerLayoutOptions.vertical' },
] as const;

const interfaceFormSchema = z.object({
  language: z.enum(['system', ...SUPPORTED_LANGUAGES]),
  chatButtonOverlayEnabled: z.boolean().optional(),
  windowTransparency: z.number().min(0).max(WINDOW_TRANSPARENCY_MAX),
  corruptedZoneTimerEnabled: z.boolean(),
  corruptedZoneTimerAnchor: tickerAnchorSchema,
  corruptedZoneTimerLocked: z.boolean(),
  corruptedZoneTimerLayout: z.enum(['horizontal', 'vertical']),
  corruptedZoneTimerOpacity: z.number().min(30).max(100),
  corruptedZoneTimerZones: z.enum(['all', 'followed']),
  corruptedZoneAlerts: z.enum(['off', 'all', 'followed']),
  corruptedZoneFollowed: z.array(z.string()),
});

type InterfaceFormValues = z.infer<typeof interfaceFormSchema>;

function toFormValues(settings: ISettings | undefined): InterfaceFormValues {
  return {
    language: settings?.language ?? 'system',
    chatButtonOverlayEnabled: settings?.chatButtonOverlayEnabled ?? true,
    windowTransparency: clampWindowTransparency(settings?.windowTransparency),
    corruptedZoneTimerEnabled: settings?.corruptedZoneTimerEnabled ?? false,
    corruptedZoneTimerAnchor: settings?.corruptedZoneTimerAnchor ?? 'top-right',
    corruptedZoneTimerLocked: settings?.corruptedZoneTimerLocked ?? false,
    corruptedZoneTimerLayout: settings?.corruptedZoneTimerLayout ?? 'horizontal',
    corruptedZoneTimerOpacity: settings?.corruptedZoneTimerOpacity ?? 90,
    corruptedZoneTimerZones: settings?.corruptedZoneTimerZones ?? 'all',
    corruptedZoneAlerts: settings?.corruptedZoneAlerts ?? 'off',
    corruptedZoneFollowed: settings?.corruptedZoneFollowed ?? [],
  };
}

export function InterfaceForm() {
  const { t } = useTranslation('settings');
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
        <SettingsGroup title={t('interface.language.group')}>
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <SettingsRow
                label={t('interface.language.label')}
                description={t('interface.language.description')}
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('interface.language.label')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="system">{t('common:language.system')}</SelectItem>
                      {SUPPORTED_LANGUAGES.map((language) => (
                        <SelectItem key={language}
                          value={language}
                          lang={language}>
                          {LANGUAGE_NAMES[language]}
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

        <SettingsGroup title={t('interface.overlays')}>
          <FormField
            control={form.control}
            name="chatButtonOverlayEnabled"
            render={({ field }) => (
              <SettingsRow
                label={t('interface.chatButton.label')}
                description={t('interface.chatButton.description')}
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
                  <Trans
                    t={t}
                    i18nKey="interface.windowTransparency.label"
                    values={{ value: field.value }}
                    components={{ num: <span className="tabular-nums" /> }}
                  />
                }
                description={t('interface.windowTransparency.description')}
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

        <SettingsGroup title={t('interface.zoneTimer.group')}>
          <FormField
            control={form.control}
            name="corruptedZoneTimerEnabled"
            render={({ field }) => (
              <SettingsRow
                label={t('interface.zoneTimer.enabled.label')}
                description={t('interface.zoneTimer.enabled.description')}
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
                label={t('interface.zoneTimer.position.label')}
                description={t('interface.zoneTimer.position.description')}
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('interface.zoneTimer.position.placeholder')} />
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
            name="corruptedZoneTimerLocked"
            render={({ field }) => (
              <SettingsRow
                label={t('interface.zoneTimer.locked.label')}
                description={t('interface.zoneTimer.locked.description')}
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
            name="corruptedZoneTimerLayout"
            render={({ field }) => (
              <SettingsRow
                label={t('interface.zoneTimer.layout.label')}
                description={t('interface.zoneTimer.layout.description')}
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('interface.zoneTimer.layout.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMER_LAYOUT_OPTIONS.map((option) => (
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
            name="corruptedZoneTimerOpacity"
            render={({ field }) => (
              <SettingsRow
                label={
                  <Trans
                    t={t}
                    i18nKey="interface.zoneTimer.opacity"
                    values={{ value: field.value }}
                    components={{ num: <span className="tabular-nums" /> }}
                  />
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
                label={t('interface.zoneTimer.zones.label')}
                description={t('interface.zoneTimer.zones.description')}
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('interface.zoneTimer.zones.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMER_ZONES_OPTIONS.map((option) => (
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
            name="corruptedZoneAlerts"
            render={({ field }) => (
              <SettingsRow
                label={t('interface.zoneTimer.alerts.label')}
                description={t('interface.zoneTimer.alerts.description')}
                control={
                  <Select value={field.value}
                    onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('interface.zoneTimer.alerts.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ZONE_ALERT_OPTIONS.map((option) => (
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
          {(form.watch('corruptedZoneAlerts') === 'followed' ||
            form.watch('corruptedZoneTimerZones') === 'followed') && (
            <FormField
              control={form.control}
              name="corruptedZoneFollowed"
              render={({ field }) => (
                <SettingsRow
                  label={t('interface.zoneTimer.followed.label')}
                  description={t('interface.zoneTimer.followed.description')}
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
