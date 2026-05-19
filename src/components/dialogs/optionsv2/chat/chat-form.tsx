import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptions } from '@/hooks/useOptions';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

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
  const { settings, isLoading, updateSettings } = useOptions();
  const [newIgnorePlayer, setNewIgnorePlayer] = React.useState('');
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const form = useForm<ChatFormValues>({
    resolver: zodResolver(chatFormSchema),
    defaultValues: {
      whisperNotificationsEnabled: settings?.whisperNotificationsEnabled ?? true,
      toastPopupsEnabled: settings?.toastPopupsEnabled ?? true,
      toastPopupTypes: settings?.toastPopupTypes ?? ['whispers', 'trade', 'joins', 'offers'],
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
          toastPopupTypes: settings.toastPopupTypes ?? ['whispers', 'trade', 'joins', 'offers'],
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
    return null;
  }

  return (
    <Form {...form}>
      <ScrollArea className="pr-2">
        <div className="flex flex-col gap-y-4 ">
          <FormField
            control={form.control}
            name="whisperNotificationTiming"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Notify when:</FormLabel>
                  <Select onValueChange={field.onChange}
                    value={field.value || 'both'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select when to notify" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in-game">Only when in game</SelectItem>
                      <SelectItem value="out-of-game">Only when out of game</SelectItem>
                      <SelectItem value="both">Always</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <FormDescription>
                  Control when whisper notifications are played based on Diablo focus state.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whisperNotificationsEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>General Notifications</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                </div>
                <FormDescription>
                  Play a notification sound when you receive non-trade whispers from players or new messages in the
                  website chat.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toastPopupsEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Toast Popups</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                </div>
                <FormDescription>Show toast popup notifications when you are tabbed out of Diablo.</FormDescription>
                {(field.value ?? true) && !isDisabled && (
                  <FormField
                    control={form.control}
                    name="toastPopupTypes"
                    render={({ field: typesField }) => {
                      const types = typesField.value ?? ['whispers', 'trade', 'joins', 'offers'];
                      const allTypes = [
                        { id: 'whispers', label: 'Whispers' },
                        { id: 'trade', label: 'Trade' },
                        { id: 'joins', label: 'Joins' },
                        { id: 'offers', label: 'Offers' },
                      ];
                      const toggleType = (typeId: string) => {
                        const updated = types.includes(typeId)
                          ? types.filter((t: string) => t !== typeId)
                          : [...types, typeId];
                        typesField.onChange(updated);
                      };
                      return (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {allTypes.map((type) => {
                            const isActive = types.includes(type.id);
                            return (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => toggleType(type.id)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                }`}
                              >
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tradeNotificationsEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Trade Notifications</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                </div>
                <FormDescription>
                  Play a notification sound when you receive trade whispers or trade offers from the website.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whisperAnnouncementsEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Announcement Notifications</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                </div>
                <FormDescription>
                  Enable notifications for messages from *announcements. By default, announcements are ignored.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whisperJoinNotificationsEnabled"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-row items-center gap-2">
                  <FormLabel>Join Notifications</FormLabel>
                  <FormControl>
                    <Switch checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled} />
                  </FormControl>
                </div>
                <FormDescription>
                  Show a notification popup when a player joins the game (only when Diablo is not focused). By default,
                  join notifications are disabled.
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whisperIgnoreList"
            render={() => (
              <FormItem>
                <FormLabel>Ignore List</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter player name to ignore"
                        value={newIgnorePlayer}
                        onChange={(e) => setNewIgnorePlayer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToIgnoreList();
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addToIgnoreList}
                        disabled={!newIgnorePlayer.trim() || isDisabled}
                      >
                        Add
                      </Button>
                    </div>
                    {ignoreList.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
                        {ignoreList.map((playerName) => (
                          <Badge key={playerName}
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1">
                            {playerName}
                            <button
                              type="button"
                              onClick={() => removeFromIgnoreList(playerName)}
                              className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                              disabled={isDisabled}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>Players in this list will not trigger whisper notifications.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="whisperNotificationVolume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Volume: {field.value ?? 70}%</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[field.value ?? 70]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={isDisabled}
                    className="w-1/2"
                  />
                </FormControl>
                <FormDescription>Adjust the volume for whisper notification sounds (0-100%).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="acceptOfferMessageTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accept Offer Message Template</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Your offer has been accepted. Game: {gameInfo}"
                    className="font-mono text-sm"
                  />
                </FormControl>
                <FormDescription>
                  Customize the message copied when accepting an offer. Available placeholders: {'{gameInfo}'},{' '}
                  {'{accountName}'}, {'{characterName}'}, {'{itemName}'}, {'{price}'}.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rejectOfferMessageTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reject Offer Message Template</FormLabel>
                <FormControl>
                  <Input {...field}
                    placeholder="Your offer has been rejected."
                    className="font-mono text-sm" />
                </FormControl>
                <FormDescription>
                  Customize the message copied when rejecting an offer. Available placeholders: {'{accountName}'},{' '}
                  {'{characterName}'}, {'{itemName}'}, {'{price}'}.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="soldOfferMessageTemplate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sold Item Message Template</FormLabel>
                <FormControl>
                  <Input {...field}
                    placeholder="The item has been sold."
                    className="font-mono text-sm" />
                </FormControl>
                <FormDescription>
                  Customize the message copied when marking an item as sold. Available placeholders: {'{accountName}'},{' '}
                  {'{characterName}'}, {'{itemName}'}, {'{price}'}.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </ScrollArea>
    </Form>
  );
}
