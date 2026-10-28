import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useOptions } from '@/hooks/useOptions';
import { AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hotkeyKeyFromEvent, hotkeyKeyLabel, hotkeyKeyToken, normalizeHotkeyKey } from '@/lib/hotkey-keys';
import { SettingsGroup, SettingsHint, SettingsRow, SettingsSkeleton } from '../settings-ui';
import type { TFunction } from 'i18next';
import { useTranslation } from '@/i18n';

/** Built per render language so validation messages follow the UI language. */
const makeHotkeyFormSchema = (t: TFunction) => {
  const invalidKey = t('hotkeys.validation.invalidKey');
  const requiredKey = z
    .string()
    .min(1, t('hotkeys.validation.enterKey'))
    .refine((key) => normalizeHotkeyKey(key) !== null, invalidKey);
  const optionalKey = z.string().refine((key) => key === '' || normalizeHotkeyKey(key) !== null, invalidKey);
  return z
    .object({
      hotkeyModifier: z.enum(['ctrl', 'alt']),
      hotkeyKey: requiredKey,
      hotkeyModifierListItem: z.enum(['ctrl', 'alt']),
      hotkeyKeyListItem: requiredKey,
      hotkeyModifierSettings: z.enum(['ctrl', 'alt']),
      hotkeyKeySettings: requiredKey,
      hotkeyModifierCurrencyValuation: z.enum(['ctrl', 'alt']),
      hotkeyKeyCurrencyValuation: requiredKey,
      hotkeyModifierChat: z.enum(['ctrl', 'alt']),
      hotkeyKeyChat: requiredKey,
      hotkeyModifierOffers: z.enum(['ctrl', 'alt']),
      hotkeyKeyOffers: requiredKey,
      hotkeyModifierDelist: z.enum(['ctrl', 'alt']),
      hotkeyKeyDelist: requiredKey,
      hotkeyModifierSnapshot: z.enum(['ctrl', 'alt']),
      hotkeyKeySnapshot: optionalKey,
      hotkeyModifierMarket: z.enum(['ctrl', 'alt']),
      hotkeyKeyMarket: optionalKey,
      hotkeyModifierBuilds: z.enum(['ctrl', 'alt']),
      hotkeyKeyBuilds: optionalKey,
    })
    .refine((data) => !(data.hotkeyModifier === 'ctrl' && hotkeyKeyToken(data.hotkeyKey) === 'C'), {
      message: t('hotkeys.validation.ctrlC'),
      path: ['hotkeyKey'],
    });
};

type HotkeyFormValues = z.infer<ReturnType<typeof makeHotkeyFormSchema>>;

type ModifierField = {
  [K in keyof HotkeyFormValues]: K extends `hotkeyModifier${string}` ? K : never;
}[keyof HotkeyFormValues];
type KeyField = {
  [K in keyof HotkeyFormValues]: K extends `hotkeyKey${string}` ? K : never;
}[keyof HotkeyFormValues];

interface HotkeyRowConfig {
  labelKey: string;
  descriptionKey: string;
  modifier: ModifierField;
  key: KeyField;
  /** Key may be left empty (unbound). */
  optional?: boolean;
}

const HOTKEY_ROWS: HotkeyRowConfig[] = [
  {
    labelKey: 'hotkeys.rows.priceCheck.label',
    descriptionKey: 'hotkeys.rows.priceCheck.description',
    modifier: 'hotkeyModifier',
    key: 'hotkeyKey',
  },
  {
    labelKey: 'hotkeys.rows.listItem.label',
    descriptionKey: 'hotkeys.rows.listItem.description',
    modifier: 'hotkeyModifierListItem',
    key: 'hotkeyKeyListItem',
  },
  {
    labelKey: 'hotkeys.rows.settings.label',
    descriptionKey: 'hotkeys.rows.settings.description',
    modifier: 'hotkeyModifierSettings',
    key: 'hotkeyKeySettings',
  },
  {
    labelKey: 'hotkeys.rows.netWorth.label',
    descriptionKey: 'hotkeys.rows.netWorth.description',
    modifier: 'hotkeyModifierCurrencyValuation',
    key: 'hotkeyKeyCurrencyValuation',
  },
  {
    labelKey: 'hotkeys.rows.chat.label',
    descriptionKey: 'hotkeys.rows.chat.description',
    modifier: 'hotkeyModifierChat',
    key: 'hotkeyKeyChat',
  },
  {
    labelKey: 'hotkeys.rows.offers.label',
    descriptionKey: 'hotkeys.rows.offers.description',
    modifier: 'hotkeyModifierOffers',
    key: 'hotkeyKeyOffers',
  },
  {
    labelKey: 'hotkeys.rows.delist.label',
    descriptionKey: 'hotkeys.rows.delist.description',
    modifier: 'hotkeyModifierDelist',
    key: 'hotkeyKeyDelist',
  },
  {
    labelKey: 'hotkeys.rows.snapshot.label',
    descriptionKey: 'hotkeys.rows.snapshot.description',
    modifier: 'hotkeyModifierSnapshot',
    key: 'hotkeyKeySnapshot',
    optional: true,
  },
  {
    labelKey: 'hotkeys.rows.market.label',
    descriptionKey: 'hotkeys.rows.market.description',
    modifier: 'hotkeyModifierMarket',
    key: 'hotkeyKeyMarket',
    optional: true,
  },
  {
    labelKey: 'hotkeys.rows.builds.label',
    descriptionKey: 'hotkeys.rows.builds.description',
    modifier: 'hotkeyModifierBuilds',
    key: 'hotkeyKeyBuilds',
    optional: true,
  },
];

export function HotkeyForm() {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();
  const hotkeyFormSchema = React.useMemo(() => makeHotkeyFormSchema(t), [t]);

  const form = useForm<HotkeyFormValues>({
    resolver: zodResolver(hotkeyFormSchema),
    defaultValues: (settings as HotkeyFormValues) || {
      hotkeyModifier: 'ctrl',
      hotkeyKey: '',
      hotkeyModifierListItem: 'ctrl',
      hotkeyKeyListItem: '',
      hotkeyModifierSettings: 'ctrl',
      hotkeyKeySettings: '',
      hotkeyModifierCurrencyValuation: 'ctrl',
      hotkeyKeyCurrencyValuation: '',
      hotkeyModifierChat: 'ctrl',
      hotkeyKeyChat: 't',
      hotkeyModifierOffers: 'ctrl',
      hotkeyKeyOffers: 'b',
      hotkeyModifierDelist: 'ctrl',
      hotkeyKeyDelist: 'u',
      hotkeyModifierSnapshot: 'ctrl',
      hotkeyKeySnapshot: '',
      hotkeyModifierMarket: 'ctrl',
      hotkeyKeyMarket: 'm',
      hotkeyModifierBuilds: 'ctrl',
      hotkeyKeyBuilds: '',
    },
  });

  React.useEffect(() => {
    if (settings) {
      form.reset(settings, { keepDirty: false });
    }
  }, [settings]);

  // Auto-save on any change
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      const current = settingsRef.current;
      const changed = Object.entries(values).some(([key, val]) => current?.[key as keyof typeof current] !== val);
      if (changed) updateSettings(values);
    });
    return () => subscription.unsubscribe();
  }, [form, updateSettings]);

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={HOTKEY_ROWS.length} />;
  }

  const values = form.watch();
  // Compared by parser token, so a key saved by an older version ('х') clashes with its translation ('[')
  const comboOf = (row: HotkeyRowConfig) => {
    const token = hotkeyKeyToken(values[row.key] as string | undefined);
    return token ? `${values[row.modifier]}+${token}` : null;
  };
  const warningFor = (row: HotkeyRowConfig): string | null => {
    const key = values[row.key] as string | undefined;
    if (key && !normalizeHotkeyKey(key)) return t('hotkeys.warning.invalidKey', { key: key.toUpperCase() });
    const combo = comboOf(row);
    if (!combo) return null;
    if (combo === 'ctrl+C') return t('hotkeys.warning.ctrlC');
    const clash = HOTKEY_ROWS.find((other) => other !== row && comboOf(other) === combo);
    return clash ? t('hotkeys.warning.clash', { action: t(clash.labelKey) }) : null;
  };

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-4">
        <SettingsGroup title={t('hotkeys.group')}>
          {HOTKEY_ROWS.map((row) => {
            const warning = warningFor(row);
            const label = hotkeyKeyLabel(values[row.key] as string | undefined);
            return (
              <FormField
                key={row.key}
                control={form.control}
                name={row.key}
                render={({ field: keyField }) => (
                  <SettingsRow
                    label={t(row.labelKey)}
                    description={t(row.descriptionKey)}
                    control={
                      <>
                        <FormField
                          control={form.control}
                          name={row.modifier}
                          render={({ field: modField }) => (
                            <Tabs defaultValue={'ctrl'}
                              value={modField.value as string}>
                              <TabsList
                                className="h-8"
                                aria-label={t('hotkeys.modifierLabel', { action: t(row.labelKey) })}
                              >
                                <TabsTrigger
                                  value={'ctrl'}
                                  className="px-2.5"
                                  onClick={() => modField.onChange('ctrl')}
                                >
                                  Ctrl
                                </TabsTrigger>
                                <TabsTrigger value={'alt'}
                                  className="px-2.5"
                                  onClick={() => modField.onChange('alt')}>
                                  Alt
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>
                          )}
                        />
                        <Plus aria-hidden
                          className="size-3.5 text-muted-foreground" />
                        <FormControl>
                          <Input
                            type="text"
                            readOnly
                            placeholder={row.optional ? t('hotkeys.off') : undefined}
                            value={label}
                            aria-invalid={warning ? true : undefined}
                            className={cn(
                              'h-9 w-11 rounded-md border-b-[3px] px-0 text-center font-mono text-sm font-semibold uppercase shadow-xs placeholder:text-[10px] placeholder:font-normal',
                              'focus-visible:border-b-primary',
                              label.length > 1 && 'w-16 text-xs',
                              warning &&
                                'aria-invalid:border-warning/80 aria-invalid:ring-warning/30 dark:aria-invalid:ring-warning/30',
                            )}
                            // The key is recorded from the key press, not typed text: a Russian-layout press of
                            // the [ key types 'х', which no global shortcut can be registered for
                            onKeyDown={(e) => {
                              if (row.optional && (e.key === 'Backspace' || e.key === 'Delete')) {
                                e.preventDefault();
                                keyField.onChange('');
                                return;
                              }
                              const key = hotkeyKeyFromEvent(e);
                              if (!key) return;
                              e.preventDefault();
                              keyField.onChange(key);
                            }}
                          />
                        </FormControl>
                      </>
                    }
                  >
                    {warning && (
                      <p role="status"
                        className="flex items-center gap-1.5 text-xs text-warning">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        {warning}
                      </p>
                    )}
                    <FormMessage />
                  </SettingsRow>
                )}
              />
            );
          })}
        </SettingsGroup>
        <SettingsHint>{t('hotkeys.hint')}</SettingsHint>
      </div>
    </Form>
  );
}
