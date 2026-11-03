import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React from 'react';
import { useOptions } from '@/hooks/useOptions';
import { AlertTriangle } from 'lucide-react';
import { hotkeyKeyToken, normalizeHotkeyKey } from '@/lib/hotkey-keys';
import { pluginHost } from '@/plugins/host/manager';
import { usePluginHost } from '@/plugins/ui/hooks';
import {
  Form,
  FormField,
  FormMessage,
  SettingsGroup,
  SettingsHint,
  SettingsRow,
  SettingsSkeleton,
} from '@pd2-trader/ui';
import type { TFunction } from 'i18next';
import { useTranslation } from '@/i18n';
import { findHotkeyClash, hotkeyCombo, type HotkeyBinding } from './conflicts';
import { HotkeyCapture } from './hotkey-capture';
import { PluginHotkeys, pluginHotkeyBindings } from './plugin-hotkeys';

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
      hotkeyModifierPalette: z.enum(['ctrl', 'alt']),
      hotkeyKeyPalette: optionalKey,
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

/** The Hotkeys rows in order (the command palette's settings source lists them too). */
export const HOTKEY_ROWS: HotkeyRowConfig[] = [
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
  {
    labelKey: 'hotkeys.rows.palette.label',
    descriptionKey: 'hotkeys.rows.palette.description',
    modifier: 'hotkeyModifierPalette',
    key: 'hotkeyKeyPalette',
    optional: true,
  },
];

export function HotkeyForm() {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();
  // Re-renders when plugins start/stop or a plugin hotkey is rebound (pluginHost.commands() below).
  usePluginHost();
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
      hotkeyModifierPalette: 'ctrl',
      hotkeyKeyPalette: 'space',
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
  const commands = pluginHost.commands();
  // Core rows and plugin commands share one conflict list: a plugin may not silently shadow a core hotkey.
  const bindings: HotkeyBinding[] = [
    ...HOTKEY_ROWS.map((row) => ({
      id: row.key,
      label: t(row.labelKey),
      modifier: values[row.modifier],
      key: values[row.key] as string | undefined,
    })),
    ...pluginHotkeyBindings(commands),
  ];
  const warningFor = (binding: HotkeyBinding): string | null => {
    const { key } = binding;
    if (key && !normalizeHotkeyKey(key)) return t('hotkeys.warning.invalidKey', { key: key.toUpperCase() });
    const combo = hotkeyCombo(binding.modifier, key);
    if (!combo) return null;
    if (combo === 'ctrl+C') return t('hotkeys.warning.ctrlC');
    const clash = findHotkeyClash(binding, bindings);
    return clash ? t('hotkeys.warning.clash', { action: clash.label }) : null;
  };

  return (
    <div className="flex flex-col gap-y-4">
      <Form {...form}>
        <SettingsGroup title={t('hotkeys.group')}>
          {HOTKEY_ROWS.map((row, index) => {
            const warning = warningFor(bindings[index]);
            return (
              <FormField
                key={row.key}
                control={form.control}
                name={row.modifier}
                render={({ field: modField }) => (
                  // The key field is the inner one: the row's FormControl reports the key's validation
                  <FormField
                    control={form.control}
                    name={row.key}
                    render={({ field: keyField }) => (
                      <SettingsRow
                        settingKey={row.key}
                        label={t(row.labelKey)}
                        description={t(row.descriptionKey)}
                        control={
                          <HotkeyCapture
                            actionLabel={t(row.labelKey)}
                            modifier={modField.value}
                            keyValue={keyField.value as string | undefined}
                            onModifierChange={modField.onChange}
                            onKeyChange={keyField.onChange}
                            clearable={row.optional}
                            warning={!!warning}
                          />
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
                )}
              />
            );
          })}
        </SettingsGroup>
      </Form>
      <PluginHotkeys commands={commands}
        warningFor={warningFor} />
      <SettingsHint>{t('hotkeys.hint')}</SettingsHint>
    </div>
  );
}
