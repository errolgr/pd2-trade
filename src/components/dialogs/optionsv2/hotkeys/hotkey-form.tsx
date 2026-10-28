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

const INVALID_KEY = "Can't be used as a hotkey";
const requiredKey = z
  .string()
  .min(1, 'Enter a key')
  .refine((key) => normalizeHotkeyKey(key) !== null, INVALID_KEY);
const optionalKey = z.string().refine((key) => key === '' || normalizeHotkeyKey(key) !== null, INVALID_KEY);

const hotkeyFormSchema = z
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
    message: 'Ctrl + C is not allowed (reserved system shortcut).',
    path: ['hotkeyKey'],
  });

type HotkeyFormValues = z.infer<typeof hotkeyFormSchema>;

type ModifierField = {
  [K in keyof HotkeyFormValues]: K extends `hotkeyModifier${string}` ? K : never;
}[keyof HotkeyFormValues];
type KeyField = {
  [K in keyof HotkeyFormValues]: K extends `hotkeyKey${string}` ? K : never;
}[keyof HotkeyFormValues];

interface HotkeyRowConfig {
  label: string;
  description: string;
  modifier: ModifierField;
  key: KeyField;
  /** Key may be left empty (unbound). */
  optional?: boolean;
}

const HOTKEY_ROWS: HotkeyRowConfig[] = [
  {
    label: 'Price check',
    description: 'Price check the item under your cursor.',
    modifier: 'hotkeyModifier',
    key: 'hotkeyKey',
  },
  {
    label: 'List item',
    description: 'List the hovered item on the market.',
    modifier: 'hotkeyModifierListItem',
    key: 'hotkeyKeyListItem',
  },
  {
    label: 'Open Settings',
    description: 'Open this settings window.',
    modifier: 'hotkeyModifierSettings',
    key: 'hotkeyKeySettings',
  },
  {
    label: 'Net Worth',
    description: 'Open the Net Worth window.',
    modifier: 'hotkeyModifierCurrencyValuation',
    key: 'hotkeyKeyCurrencyValuation',
  },
  {
    label: 'Chat Window',
    description: 'Show or hide the chat window.',
    modifier: 'hotkeyModifierChat',
    key: 'hotkeyKeyChat',
  },
  {
    label: 'Offers',
    description: 'Open chat on the people you are selling to.',
    modifier: 'hotkeyModifierOffers',
    key: 'hotkeyKeyOffers',
  },
  {
    label: 'Delist Item',
    description: 'Delist the hovered item from the market.',
    modifier: 'hotkeyModifierDelist',
    key: 'hotkeyKeyDelist',
  },
  {
    label: 'Net Worth Snapshot',
    description: 'Take a net worth snapshot right away.',
    modifier: 'hotkeyModifierSnapshot',
    key: 'hotkeyKeySnapshot',
    optional: true,
  },
  {
    label: 'Market',
    description: 'Show or hide the market browser.',
    modifier: 'hotkeyModifierMarket',
    key: 'hotkeyKeyMarket',
    optional: true,
  },
  {
    label: 'Builds',
    description: 'Show or hide the ladder builds.',
    modifier: 'hotkeyModifierBuilds',
    key: 'hotkeyKeyBuilds',
    optional: true,
  },
];

export function HotkeyForm() {
  const { settings, isLoading, updateSettings } = useOptions();

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
    if (key && !normalizeHotkeyKey(key)) {
      return `${key.toUpperCase()} can't be used as a hotkey. Click the box and press another key.`;
    }
    const combo = comboOf(row);
    if (!combo) return null;
    if (combo === 'ctrl+C') return 'Ctrl + C is reserved for copying items. Pick another key.';
    const clash = HOTKEY_ROWS.find((other) => other !== row && comboOf(other) === combo);
    return clash ? `Also used by ${clash.label}.` : null;
  };

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-4">
        <SettingsGroup title="Shortcuts">
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
                    label={row.label}
                    description={row.description}
                    control={
                      <>
                        <FormField
                          control={form.control}
                          name={row.modifier}
                          render={({ field: modField }) => (
                            <Tabs defaultValue={'ctrl'}
                              value={modField.value as string}>
                              <TabsList className="h-8"
                                aria-label={`${row.label} modifier`}>
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
                            placeholder={row.optional ? 'Off' : undefined}
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
        <SettingsHint>
          Click a key box and press the key to use. Press Backspace in the snapshot, market or builds box to turn that
          hotkey off.
        </SettingsHint>
      </div>
    </Form>
  );
}
