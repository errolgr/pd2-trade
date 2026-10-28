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
import { SettingsGroup, SettingsHint, SettingsRow, SettingsSkeleton } from '../settings-ui';
import type { TFunction } from 'i18next';
import { useTranslation } from '@/i18n';

/** Built per render language so validation messages follow the UI language. */
const makeHotkeyFormSchema = (t: TFunction) => {
  const key = (optional = false) => {
    const base = z.string();
    return (optional ? base : base.min(1, t('hotkeys.validation.enterKey')))
      .max(1, t('hotkeys.validation.oneChar'))
      .regex(optional ? /^[a-z0-9]?$/i : /^[a-z0-9]$/i, t('hotkeys.validation.letterOrNumber'));
  };
  return z
    .object({
      hotkeyModifier: z.enum(['ctrl', 'alt']),
      hotkeyKey: key(),
      hotkeyModifierListItem: z.enum(['ctrl', 'alt']),
      hotkeyKeyListItem: key(),
      hotkeyModifierSettings: z.enum(['ctrl', 'alt']),
      hotkeyKeySettings: key(),
      hotkeyModifierCurrencyValuation: z.enum(['ctrl', 'alt']),
      hotkeyKeyCurrencyValuation: key(),
      hotkeyModifierChat: z.enum(['ctrl', 'alt']),
      hotkeyKeyChat: key(),
      hotkeyModifierOffers: z.enum(['ctrl', 'alt']),
      hotkeyKeyOffers: key(),
      hotkeyModifierDelist: z.enum(['ctrl', 'alt']),
      hotkeyKeyDelist: key(),
      hotkeyModifierSnapshot: z.enum(['ctrl', 'alt']),
      hotkeyKeySnapshot: key(true),
      hotkeyModifierMarket: z.enum(['ctrl', 'alt']),
      hotkeyKeyMarket: key(true),
      hotkeyModifierBuilds: z.enum(['ctrl', 'alt']),
      hotkeyKeyBuilds: key(true),
    })
    .refine((data) => !(data.hotkeyModifier === 'ctrl' && data.hotkeyKey?.toLowerCase() === 'c'), {
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
  const comboOf = (row: HotkeyRowConfig) => {
    const key = (values[row.key] as string | undefined)?.toLowerCase();
    return key ? `${values[row.modifier]}+${key}` : null;
  };
  const warningFor = (row: HotkeyRowConfig): string | null => {
    const combo = comboOf(row);
    if (!combo) return null;
    if (combo === 'ctrl+c') return t('hotkeys.warning.ctrlC');
    const clash = HOTKEY_ROWS.find((other) => other !== row && comboOf(other) === combo);
    return clash ? t('hotkeys.warning.clash', { action: t(clash.labelKey) }) : null;
  };

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-4">
        <SettingsGroup title={t('hotkeys.group')}>
          {HOTKEY_ROWS.map((row) => {
            const warning = warningFor(row);
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
                            maxLength={1}
                            placeholder={row.optional ? t('hotkeys.off') : undefined}
                            value={(keyField.value as string | undefined)?.toUpperCase() ?? ''}
                            aria-invalid={warning ? true : undefined}
                            className={cn(
                              'h-9 w-11 rounded-md border-b-[3px] px-0 text-center font-mono text-sm font-semibold uppercase shadow-xs placeholder:text-[10px] placeholder:font-normal',
                              'focus-visible:border-b-primary',
                              warning &&
                                'aria-invalid:border-warning/80 aria-invalid:ring-warning/30 dark:aria-invalid:ring-warning/30',
                            )}
                            onChange={(e) => keyField.onChange(e.target.value.toLowerCase())}
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
