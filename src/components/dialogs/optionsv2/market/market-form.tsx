import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import { ISettings, useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_WHISPER_TEMPLATE } from '@/pages/market/lib/whisper';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';
import {
  ageDayOptions,
  alertSecondsOptions,
  AUTO_DELIST_OPTIONS,
  AUTO_DELIST_VALUES,
  BUYOUT_OPTIONS,
  BUYOUT_VALUES,
  LISTINGS_VIEW_OPTIONS,
  LISTINGS_VIEW_VALUES,
  optionLabel,
  PAGE_SIZE_OPTIONS,
  SELLER_OPTIONS,
  SELLER_VALUES,
  type SettingOption,
  SORT_OPTIONS,
  SORT_VALUES,
} from '../setting-options';
import { Trans, useTranslation } from '@/i18n';

const marketFormSchema = z.object({
  stashAutoDelist: z.enum(AUTO_DELIST_VALUES),
  myListingsView: z.enum(LISTINGS_VIEW_VALUES),
  marketDefaultSort: z.enum(SORT_VALUES),
  marketDefaultSeller: z.enum(SELLER_VALUES),
  marketDefaultHasBuyout: z.enum(BUYOUT_VALUES),
  marketDefaultMaxAgeDays: z.number().int().positive(),
  marketPageSize: z.union([z.literal(25), z.literal(50), z.literal(100)]),
  marketWhisperTemplate: z.string(),
  marketShowDealBadges: z.boolean(),
  marketShowPriceHistory: z.boolean(),
  marketShowSellerCard: z.boolean(),
  marketAlertSoundEnabled: z.boolean(),
  marketAlertVolume: z.number().int().min(0).max(100),
  marketAlertToastSeconds: z.number().int().positive(),
});

type MarketFormValues = z.infer<typeof marketFormSchema>;

function toFormValues(settings: ISettings | undefined): MarketFormValues {
  return {
    stashAutoDelist: settings?.stashAutoDelist ?? 'ask',
    myListingsView: settings?.myListingsView ?? 'cards',
    marketDefaultSort: settings?.marketDefaultSort ?? 'newest',
    marketDefaultSeller: settings?.marketDefaultSeller ?? 'all',
    marketDefaultHasBuyout: settings?.marketDefaultHasBuyout ?? 'any',
    marketDefaultMaxAgeDays: settings?.marketDefaultMaxAgeDays ?? 3,
    marketPageSize: settings?.marketPageSize ?? 25,
    marketWhisperTemplate: settings?.marketWhisperTemplate ?? '',
    marketShowDealBadges: settings?.marketShowDealBadges ?? true,
    marketShowPriceHistory: settings?.marketShowPriceHistory ?? true,
    marketShowSellerCard: settings?.marketShowSellerCard ?? true,
    marketAlertSoundEnabled: settings?.marketAlertSoundEnabled ?? true,
    marketAlertVolume: settings?.marketAlertVolume ?? 70,
    marketAlertToastSeconds: settings?.marketAlertToastSeconds ?? 8,
  };
}

/** A settings row with a Select bound to a form field; numeric fields round-trip through strings. */
function SelectRow({
  settingKey,
  label,
  description,
  value,
  options,
  onChange,
}: {
  settingKey: keyof MarketFormValues;
  label: string;
  description?: string;
  value: string;
  options: SettingOption[];
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('settings');
  return (
    <SettingsRow
      settingKey={settingKey}
      label={label}
      description={description}
      control={
        <Select value={value}
          onValueChange={onChange}>
          <FormControl>
            <SelectTrigger className="w-[220px]"
              aria-label={label}>
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value}
                value={option.value}>
                {optionLabel(t, option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <FormMessage />
    </SettingsRow>
  );
}

export function MarketForm() {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();

  const form = useForm<MarketFormValues>({
    resolver: zodResolver(marketFormSchema),
    defaultValues: toFormValues(settings),
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) form.reset(toFormValues(settings), { keepDirty: false });
  }, [settings, form]);

  // Auto-save on any change (debounced so typing the whisper message or dragging the volume writes once)
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  const debounceRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    const subscription = form.watch(() => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        const parsed = marketFormSchema.safeParse(form.getValues());
        if (!parsed.success) return;
        const current = toFormValues(settingsRef.current);
        const changed = Object.fromEntries(
          Object.entries(parsed.data).filter(([key, val]) => current[key as keyof MarketFormValues] !== val),
        ) as Partial<ISettings>;
        if (Object.keys(changed).length > 0) updateSettings(changed);
      }, 300);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={6} />;
  }

  const switchRow = (
    name: 'marketShowDealBadges' | 'marketShowPriceHistory' | 'marketShowSellerCard' | 'marketAlertSoundEnabled',
    key: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <SettingsRow
          settingKey={name}
          label={t(`${key}.label`)}
          description={t(`${key}.description`)}
          control={
            <FormControl>
              <Switch checked={field.value}
                onCheckedChange={field.onChange}
                aria-label={t(`${key}.label`)} />
            </FormControl>
          }
        />
      )}
    />
  );

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <SettingsGroup title={t('market.listings.group')}>
          <FormField
            control={form.control}
            name="stashAutoDelist"
            render={({ field }) => (
              <SelectRow
                settingKey="stashAutoDelist"
                label={t('market.listings.autoDelist.label')}
                description={t('market.listings.autoDelist.description')}
                value={field.value}
                options={AUTO_DELIST_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
          <FormField
            control={form.control}
            name="myListingsView"
            render={({ field }) => (
              <SelectRow
                settingKey="myListingsView"
                label={t('market.listings.view.label')}
                description={t('market.listings.view.description')}
                value={field.value}
                options={LISTINGS_VIEW_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </SettingsGroup>

        <SettingsGroup title={t('market.browser.group')}>
          <FormField
            control={form.control}
            name="marketDefaultSort"
            render={({ field }) => (
              <SelectRow
                settingKey="marketDefaultSort"
                label={t('market.browser.sort.label')}
                description={t('market.browser.defaultsHint')}
                value={field.value}
                options={SORT_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
          <FormField
            control={form.control}
            name="marketDefaultSeller"
            render={({ field }) => (
              <SelectRow
                settingKey="marketDefaultSeller"
                label={t('market.browser.seller.label')}
                value={field.value}
                options={SELLER_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
          <FormField
            control={form.control}
            name="marketDefaultHasBuyout"
            render={({ field }) => (
              <SelectRow
                settingKey="marketDefaultHasBuyout"
                label={t('market.browser.buyout.label')}
                value={field.value}
                options={BUYOUT_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
          <FormField
            control={form.control}
            name="marketDefaultMaxAgeDays"
            render={({ field }) => (
              <SelectRow
                settingKey="marketDefaultMaxAgeDays"
                label={t('market.browser.age.label')}
                value={String(field.value)}
                options={ageDayOptions(field.value)}
                onChange={(value) => field.onChange(Number(value))}
              />
            )}
          />
          <FormField
            control={form.control}
            name="marketPageSize"
            render={({ field }) => (
              <SelectRow
                settingKey="marketPageSize"
                label={t('market.browser.pageSize.label')}
                value={String(field.value)}
                options={PAGE_SIZE_OPTIONS}
                onChange={(value) => field.onChange(Number(value))}
              />
            )}
          />
          <FormField
            control={form.control}
            name="marketWhisperTemplate"
            render={({ field }) => (
              <SettingsRow
                settingKey="marketWhisperTemplate"
                layout="stacked"
                label={t('market.browser.whisper.label')}
                description={t('market.browser.whisper.description')}
                control={
                  <FormControl>
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={DEFAULT_WHISPER_TEMPLATE}
                      maxLength={200}
                      aria-label={t('market.browser.whisper.label')}
                    />
                  </FormControl>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          {switchRow('marketShowDealBadges', 'market.browser.dealBadges')}
          {switchRow('marketShowPriceHistory', 'market.browser.priceHistory')}
          {switchRow('marketShowSellerCard', 'market.browser.sellerCard')}
        </SettingsGroup>

        <SettingsGroup title={t('market.alerts.group')}>
          <FormField
            control={form.control}
            name="marketAlertToastSeconds"
            render={({ field }) => (
              <SelectRow
                settingKey="marketAlertToastSeconds"
                label={t('market.alerts.duration.label')}
                description={t('market.alerts.duration.description')}
                value={String(field.value)}
                options={alertSecondsOptions(field.value)}
                onChange={(value) => field.onChange(Number(value))}
              />
            )}
          />
          {switchRow('marketAlertSoundEnabled', 'market.alerts.sound')}
          <FormField
            control={form.control}
            name="marketAlertVolume"
            render={({ field }) => {
              const volume = field.value;
              const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
              const soundOff = !form.watch('marketAlertSoundEnabled');
              return (
                <SettingsRow
                  settingKey="marketAlertVolume"
                  disabled={soundOff}
                  label={
                    <Trans
                      t={t}
                      i18nKey="market.alerts.volume.label"
                      values={{ value: volume }}
                      components={{ num: <span className="tabular-nums" /> }}
                    />
                  }
                  description={t('market.alerts.volume.description')}
                  control={
                    <div className="flex w-[240px] items-center gap-3">
                      <VolumeIcon aria-hidden
                        className="size-4 shrink-0 text-muted-foreground" />
                      <FormControl>
                        <Slider
                          aria-label={t('market.alerts.volume.ariaLabel')}
                          min={0}
                          max={100}
                          step={1}
                          value={[volume]}
                          onValueChange={(value) => field.onChange(value[0])}
                          disabled={soundOff}
                          className="flex-1"
                        />
                      </FormControl>
                    </div>
                  }
                >
                  <FormMessage />
                </SettingsRow>
              );
            }}
          />
        </SettingsGroup>
      </div>
    </Form>
  );
}
