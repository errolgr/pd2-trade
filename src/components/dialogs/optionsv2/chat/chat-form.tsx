import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormMessage } from '@/components/ui/form';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellOff, Check, Plus, UserX, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DUR, EASE_OUT, fadeIn, popIn } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { templatePlaceholders } from '@/lib/message-templates';
import { SettingsGroup, SettingsRow, SettingsSkeleton } from '../settings-ui';
import { ChatTemplatesEditor } from './chat-templates-editor';
import { Trans, useTranslation } from '@/i18n';

const TOAST_TYPES = [
  { id: 'whispers', labelKey: 'chat.toastTypes.whispers' },
  { id: 'trade', labelKey: 'chat.toastTypes.trade' },
  { id: 'joins', labelKey: 'chat.toastTypes.joins' },
  { id: 'offers', labelKey: 'chat.toastTypes.offers' },
  { id: 'networth', labelKey: 'chat.toastTypes.networth' },
] as const;

const COMMON_TOKENS = ['{accountName}', '{characterName}', '{itemName}', '{price}'];

const chatFormSchema = z.object({
  whisperNotificationsEnabled: z.boolean().optional(),
  toastPopupsEnabled: z.boolean().optional(),
  toastPopupTypes: z.array(z.string()).optional(),
  tradeNotificationsEnabled: z.boolean().optional(),
  whisperIgnoreList: z.array(z.string()).optional(),
  whisperAnnouncementsEnabled: z.boolean().optional(),
  whisperJoinNotificationsEnabled: z.boolean().optional(),
  whisperNotificationTiming: z.enum(['in-game', 'out-of-game', 'both', 'never']).optional(),
  whisperNotificationVolume: z.number().int().min(0).max(100).optional(),
  acceptOfferMessageTemplate: z.string().optional(),
  rejectOfferMessageTemplate: z.string().optional(),
  soldOfferMessageTemplate: z.string().optional(),
});

type ChatFormValues = z.infer<typeof chatFormSchema>;

export function ChatForm() {
  const { t } = useTranslation('settings');
  const { settings, isLoading, updateSettings } = useOptions();
  const [newIgnorePlayer, setNewIgnorePlayer] = React.useState('');
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const form = useForm<ChatFormValues>({
    resolver: zodResolver(chatFormSchema),
    defaultValues: {
      whisperNotificationsEnabled: settings?.whisperNotificationsEnabled ?? true,
      toastPopupsEnabled: settings?.toastPopupsEnabled ?? true,
      toastPopupTypes: settings?.toastPopupTypes ?? ['whispers', 'trade', 'joins', 'offers', 'networth'],
      tradeNotificationsEnabled: settings?.tradeNotificationsEnabled ?? true,
      whisperIgnoreList: settings?.whisperIgnoreList || [],
      whisperAnnouncementsEnabled: settings?.whisperAnnouncementsEnabled ?? false,
      whisperJoinNotificationsEnabled: settings?.whisperJoinNotificationsEnabled ?? false,
      whisperNotificationTiming: settings?.whisperNotificationTiming || 'both',
      whisperNotificationVolume: settings?.whisperNotificationVolume ?? 70,
      acceptOfferMessageTemplate:
        settings?.acceptOfferMessageTemplate || 'Your offer has been accepted. Game: {gameInfo}',
      rejectOfferMessageTemplate: settings?.rejectOfferMessageTemplate || 'Your offer has been rejected.',
      soldOfferMessageTemplate: settings?.soldOfferMessageTemplate || 'The item has been sold.',
    },
  });

  // Reset form when settings change externally
  React.useEffect(() => {
    if (settings) {
      form.reset(
        {
          whisperNotificationsEnabled: settings.whisperNotificationsEnabled ?? true,
          toastPopupsEnabled: settings.toastPopupsEnabled ?? true,
          toastPopupTypes: settings.toastPopupTypes ?? ['whispers', 'trade', 'joins', 'offers', 'networth'],
          tradeNotificationsEnabled: settings.tradeNotificationsEnabled ?? true,
          whisperIgnoreList: settings.whisperIgnoreList || [],
          whisperAnnouncementsEnabled: settings.whisperAnnouncementsEnabled ?? false,
          whisperJoinNotificationsEnabled: settings.whisperJoinNotificationsEnabled ?? false,
          whisperNotificationTiming: settings.whisperNotificationTiming || 'both',
          whisperNotificationVolume: settings.whisperNotificationVolume ?? 70,
          acceptOfferMessageTemplate:
            settings.acceptOfferMessageTemplate || 'Your offer has been accepted. Game: {gameInfo}',
          rejectOfferMessageTemplate: settings.rejectOfferMessageTemplate || 'Your offer has been rejected.',
          soldOfferMessageTemplate: settings.soldOfferMessageTemplate || 'The item has been sold.',
        },
        { keepDirty: false },
      );
    }
  }, [settings, form]);

  // Auto-save on any change (debounced for text inputs)
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const current = settingsRef.current;
        const changed = Object.entries(values).some(
          ([key, val]) => JSON.stringify(current?.[key as keyof typeof current]) !== JSON.stringify(val),
        );
        if (changed) updateSettings(values);
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form, updateSettings]);

  const ignoreList = form.watch('whisperIgnoreList') || [];
  const notificationTiming = form.watch('whisperNotificationTiming') || 'both';
  const isDisabled = notificationTiming === 'never';

  const addToIgnoreList = () => {
    const playerName = newIgnorePlayer.trim().toLowerCase();
    if (playerName && !ignoreList.includes(playerName)) {
      const updatedList = [...ignoreList, playerName];
      form.setValue('whisperIgnoreList', updatedList);
      setNewIgnorePlayer('');
    }
  };

  const removeFromIgnoreList = (playerName: string) => {
    const updatedList = ignoreList.filter((name) => name !== playerName);
    form.setValue('whisperIgnoreList', updatedList);
  };

  if (isLoading || !settings) {
    return <SettingsSkeleton rows={6} />;
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-y-6">
        <SettingsGroup title={t('chat.notifications.group')}>
          <FormField
            control={form.control}
            name="whisperNotificationTiming"
            render={({ field }) => (
              <SettingsRow
                label={t('chat.timing.label')}
                description={t('chat.timing.description')}
                control={
                  <Select onValueChange={field.onChange}
                    value={field.value || 'both'}>
                    <FormControl>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={t('chat.timing.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in-game">{t('chat.timing.options.inGame')}</SelectItem>
                      <SelectItem value="out-of-game">{t('chat.timing.options.outOfGame')}</SelectItem>
                      <SelectItem value="both">{t('chat.timing.options.always')}</SelectItem>
                      <SelectItem value="never">{t('chat.timing.options.never')}</SelectItem>
                    </SelectContent>
                  </Select>
                }
              >
                <AnimatePresence initial={false}>
                  {isDisabled && (
                    <motion.p
                      key="muted"
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
                    >
                      <BellOff className="size-3.5 shrink-0" />
                      {t('chat.timing.off')}
                    </motion.p>
                  )}
                </AnimatePresence>
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="whisperNotificationsEnabled"
            render={({ field }) => (
              <SettingsRow
                disabled={isDisabled}
                label={t('chat.general.label')}
                description={t('chat.general.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                }
              />
            )}
          />
          <FormField
            control={form.control}
            name="toastPopupsEnabled"
            render={({ field }) => (
              <SettingsRow
                disabled={isDisabled}
                label={t('chat.toasts.label')}
                description={t('chat.toasts.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                }
              >
                <AnimatePresence initial={false}>
                  {(field.value ?? true) && !isDisabled && (
                    <motion.div
                      key="toast-types"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transition: { duration: DUR.med, ease: EASE_OUT } }}
                      exit={{ height: 0, opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } }}
                      className="-m-1 overflow-hidden p-1"
                    >
                      <FormField
                        control={form.control}
                        name="toastPopupTypes"
                        render={({ field: typesField }) => {
                          const types = typesField.value ?? ['whispers', 'trade', 'joins', 'offers', 'networth'];
                          const toggleType = (typeId: string) => {
                            const updated = types.includes(typeId)
                              ? types.filter((type: string) => type !== typeId)
                              : [...types, typeId];
                            typesField.onChange(updated);
                          };
                          return (
                            <div role="group"
                              aria-label={t('chat.toasts.typesLabel')}
                              className="flex flex-wrap gap-2">
                              {TOAST_TYPES.map((type) => {
                                const isActive = types.includes(type.id);
                                return (
                                  <button
                                    key={type.id}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => toggleType(type.id)}
                                    className={cn(
                                      'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none',
                                      'transition-[color,background-color,border-color,box-shadow,transform] duration-(--dur-fast) ease-out',
                                      'focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-95',
                                      isActive
                                        ? 'border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
                                        : 'border-border bg-muted/60 text-muted-foreground hover:border-ring/50 hover:bg-muted hover:text-foreground',
                                    )}
                                  >
                                    {isActive ? <Check className="size-3" /> : <Plus className="size-3" />}
                                    {t(type.labelKey)}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="tradeNotificationsEnabled"
            render={({ field }) => (
              <SettingsRow
                disabled={isDisabled}
                label={t('chat.trade.label')}
                description={t('chat.trade.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                }
              />
            )}
          />
          <FormField
            control={form.control}
            name="whisperAnnouncementsEnabled"
            render={({ field }) => (
              <SettingsRow
                disabled={isDisabled}
                label={t('chat.announcements.label')}
                description={t('chat.announcements.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                }
              />
            )}
          />
          <FormField
            control={form.control}
            name="whisperJoinNotificationsEnabled"
            render={({ field }) => (
              <SettingsRow
                disabled={isDisabled}
                label={t('chat.joins.label')}
                description={t('chat.joins.description')}
                control={
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                }
              />
            )}
          />
        </SettingsGroup>

        <SettingsGroup
          title={t('chat.ignore.group')}
          aside={
            ignoreList.length > 0 && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {t('chat.ignore.count', { count: ignoreList.length })}
              </span>
            )
          }
        >
          <FormField
            control={form.control}
            name="whisperIgnoreList"
            render={() => (
              <SettingsRow
                layout="stacked"
                disabled={isDisabled}
                label={t('chat.ignore.label')}
                description={t('chat.ignore.description')}
                control={
                  <>
                    <FormControl>
                      <Input
                        placeholder={t('chat.ignore.placeholder')}
                        value={newIgnorePlayer}
                        onChange={(e) => setNewIgnorePlayer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToIgnoreList();
                          }
                        }}
                        disabled={isDisabled}
                        className="flex-1"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addToIgnoreList}
                      disabled={!newIgnorePlayer.trim() || isDisabled}
                    >
                      <UserX />
                      {t('common:actions.add')}
                    </Button>
                  </>
                }
              >
                {ignoreList.length > 0 ? (
                  <div className="flex min-h-[44px] flex-wrap gap-2 rounded-md border border-border/70 bg-background/40 p-2">
                    <AnimatePresence initial={false}>
                      {ignoreList.map((playerName) => (
                        <motion.div
                          key={playerName}
                          layout
                          variants={popIn}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                        >
                          <Badge variant="secondary"
                            className="flex items-center gap-1 py-1 pr-1 pl-2.5">
                            {playerName}
                            <button
                              type="button"
                              aria-label={t('chat.ignore.removeNamed', { name: playerName })}
                              onClick={() => removeFromIgnoreList(playerName)}
                              className="ml-0.5 rounded-full p-0.5 text-muted-foreground outline-none transition-colors hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none"
                              disabled={isDisabled}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border/70 px-3 py-2.5 text-center text-xs text-muted-foreground">
                    {t('chat.ignore.empty')}
                  </p>
                )}
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>

        <SettingsGroup title={t('chat.sound.group')}>
          <FormField
            control={form.control}
            name="whisperNotificationVolume"
            render={({ field }) => {
              const volume = field.value ?? 70;
              const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
              return (
                <SettingsRow
                  disabled={isDisabled}
                  label={
                    <Trans
                      t={t}
                      i18nKey="chat.sound.notificationVolume.label"
                      values={{ value: volume }}
                      components={{ num: <span className="tabular-nums" /> }}
                    />
                  }
                  description={t('chat.sound.notificationVolume.description')}
                  control={
                    <div className="flex w-[240px] items-center gap-3">
                      <VolumeIcon aria-hidden
                        className="size-4 shrink-0 text-muted-foreground" />
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[volume]}
                          onValueChange={(value) => field.onChange(value[0])}
                          disabled={isDisabled}
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

        <SettingsGroup title={t('chat.templates.group')}>
          <ChatTemplatesEditor />
          <FormField
            control={form.control}
            name="acceptOfferMessageTemplate"
            render={({ field }) => (
              <SettingsRow
                layout="stacked"
                label={t('chat.templates.accept.label')}
                description={
                  <PlaceholderHint
                    intro={t('chat.templates.accept.intro')}
                    tokens={['{gameInfo}', ...COMMON_TOKENS]}
                    text={field.value ?? ''}
                    onInsert={(token) => field.onChange(`${field.value ?? ''}${token}`)}
                  />
                }
                control={
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your offer has been accepted. Game: {gameInfo}"
                      className="font-mono text-sm"
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
            name="rejectOfferMessageTemplate"
            render={({ field }) => (
              <SettingsRow
                layout="stacked"
                label={t('chat.templates.reject.label')}
                description={
                  <PlaceholderHint
                    intro={t('chat.templates.reject.intro')}
                    tokens={COMMON_TOKENS}
                    text={field.value ?? ''}
                    onInsert={(token) => field.onChange(`${field.value ?? ''}${token}`)}
                  />
                }
                control={
                  <FormControl>
                    <Input {...field}
                      placeholder="Your offer has been rejected."
                      className="font-mono text-sm" />
                  </FormControl>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
          <FormField
            control={form.control}
            name="soldOfferMessageTemplate"
            render={({ field }) => (
              <SettingsRow
                layout="stacked"
                label={t('chat.templates.sold.label')}
                description={
                  <PlaceholderHint
                    intro={t('chat.templates.sold.intro')}
                    tokens={COMMON_TOKENS}
                    text={field.value ?? ''}
                    onInsert={(token) => field.onChange(`${field.value ?? ''}${token}`)}
                  />
                }
                control={
                  <FormControl>
                    <Input {...field}
                      placeholder="The item has been sold."
                      className="font-mono text-sm" />
                  </FormControl>
                }
              >
                <FormMessage />
              </SettingsRow>
            )}
          />
        </SettingsGroup>
      </div>
    </Form>
  );
}

/**
 * "Customize the message copied when …" with clickable placeholder chips that append the token, and the
 * custom placeholders the template asks for when used from the chat's "/" menu.
 */
function PlaceholderHint({
  intro,
  tokens,
  text,
  onInsert,
}: {
  intro: string;
  tokens: string[];
  text: string;
  onInsert: (token: string) => void;
}) {
  const { t } = useTranslation('settings');
  const asks = templatePlaceholders(text);
  return (
    <span className="flex flex-col gap-1.5">
      <span>{intro}</span>
      <span className="flex flex-wrap gap-1.5">
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            title={t('chat.templates.insertToken', { token })}
            onClick={() => onInsert(token)}
            className="rounded-sm border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 outline-none transition-[color,background-color,border-color,transform] duration-(--dur-fast) ease-out hover:border-primary/60 hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-95"
          >
            {token}
          </button>
        ))}
      </span>
      {asks.length > 0 && (
        <span>{t('chat.templates.asks', { placeholders: asks.map((name) => `{${name}}`).join(' ') })}</span>
      )}
    </span>
  );
}
