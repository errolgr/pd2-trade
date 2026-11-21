import React from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Loader2, RotateCw, Send, X } from 'lucide-react';
import { Form, FormControl } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOptions } from '@/hooks/useOptions';
import { dmReporter } from '@/hooks/useDiscordDmReporter';
import {
  DiscordDmApiError,
  type DmPrefs,
  type DmPrefsUpdate,
  type DmStatus,
  type DmType,
  getDmPrefs,
  getDmStatus,
  sendTestDm,
  TRADER_NAME,
  updateDmPrefs,
} from '@/lib/discord-dm';
import { SettingsGroup, SettingsHint, SettingsNavContext, SettingsRow } from '../settings-ui';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-live' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; prefs: DmPrefs; status: DmStatus };

const TYPE_ROWS: { type: DmType; label: string; description: string }[] = [
  {
    type: 'whisper',
    label: 'In-game whispers',
    description: 'Whispers from the same player within 2 minutes are one DM.',
  },
  { type: 'offer', label: 'Offers on your listings', description: 'Who offered what, on which listing.' },
  { type: 'site_message', label: 'Website chat messages', description: 'Messages in the PD2 website chat.' },
  { type: 'market_watch', label: 'Market watch', description: 'New listings for your watched saved searches.' },
  { type: 'listing_sold', label: 'Listing sold', description: 'One of your listings sold.' },
  { type: 'listing_expiring', label: 'Listing expiring', description: 'One of your listings is about to expire.' },
];

const AWAY_MINUTES = [0, 1, 2, 5, 10, 15, 30, 60, 120, 240];
const awayLabel = (minutes: number) =>
  minutes === 0 ? 'Always' : minutes < 60 ? `${minutes} min` : `${minutes / 60} h`;
const SNOOZE_HOURS = [1, 8];

const formatTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

/**
 * Discord DMs (Settings › Discord): the last DM Discord refused, which events DM you, after how long away, a snooze,
 * muted traders and a test DM. Linking the Discord account is under Settings › Account. Stored on pd2trader.com per
 * PD2 login; every change saves at once, and the app's DM reporter uses it straight away.
 */
export function DiscordDmSettings() {
  const { settings } = useOptions();
  const token = settings?.pd2Token ?? null;
  // SettingsRow's label and description read a form context; these rows save straight to the server
  const form = useForm();
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const goTo = React.useContext(SettingsNavContext);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [mutedInput, setMutedInput] = React.useState('');

  const load = React.useCallback(async () => {
    if (!token) {
      setState({ kind: 'signed-out' });
      return;
    }
    try {
      const [prefs, status] = await Promise.all([getDmPrefs(token), getDmStatus(token)]);
      dmReporter.setSettings(token, { prefs, status });
      setState({ kind: 'ready', prefs, status });
    } catch (err) {
      if (err instanceof DiscordDmApiError && err.status === 404) setState({ kind: 'not-live' });
      else if (err instanceof DiscordDmApiError && err.status === 401) setState({ kind: 'signed-out' });
      else setState({ kind: 'error', message: err instanceof Error ? err.message : 'Could not load Discord settings' });
    }
  }, [token]);

  React.useEffect(() => {
    setState({ kind: 'loading' });
    void load();
  }, [load]);

  if (state.kind !== 'ready') {
    return (
      <Form {...form}>
        <SettingsGroup title="Discord DMs">
          <SettingsRow
            label="Discord DMs"
            description={
              state.kind === 'loading'
                ? 'Loading…'
                : state.kind === 'signed-out'
                  ? 'Sign in with PD2 (Settings › Account) to get DMs on Discord.'
                  : state.kind === 'not-live'
                    ? 'Discord DMs are not available yet.'
                    : state.message
            }
            control={
              state.kind === 'loading' ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : state.kind === 'error' ? (
                <Button type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => void load()}>
                  <RotateCw className="size-3.5" /> Retry
                </Button>
              ) : null
            }
          />
        </SettingsGroup>
      </Form>
    );
  }

  const { prefs, status } = state;
  const save = async (update: DmPrefsUpdate) => {
    if (!token) return;
    const optimistic: DmPrefs = { ...prefs, ...update, types: { ...prefs.types, ...update.types } };
    setState({ kind: 'ready', prefs: optimistic, status });
    setSaving(true);
    setError(null);
    try {
      const saved = await updateDmPrefs(token, update);
      dmReporter.setSettings(token, { prefs: saved, status });
      setState({ kind: 'ready', prefs: saved, status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setState({ kind: 'ready', prefs, status });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!token) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestDm(token);
      setTestResult(
        result.sent
          ? { ok: true, text: 'Sent. Check your Discord DMs.' }
          : { ok: false, text: result.error ?? 'Not sent' },
      );
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : 'Not sent' });
    } finally {
      setTesting(false);
      void load();
    }
  };

  const addMuted = () => {
    const name = mutedInput.trim().replace(/^\*/, '');
    if (!TRADER_NAME.test(name)) {
      setError('Muted traders are account or character names (letters, digits, . _ -, at most 32).');
      return;
    }
    setMutedInput('');
    if (!prefs.mutedTraders.includes(name.toLowerCase()))
      void save({ mutedTraders: [...prefs.mutedTraders, name.toLowerCase()] });
  };

  const snoozed = prefs.snoozedUntil && Date.parse(prefs.snoozedUntil) > Date.now() ? prefs.snoozedUntil : null;
  const awayOptions = AWAY_MINUTES.includes(prefs.awayMinutes)
    ? AWAY_MINUTES
    : [...AWAY_MINUTES, prefs.awayMinutes].sort((a, b) => a - b);
  const linked = status.enabled && status.linked;

  return (
    <Form {...form}>
      <SettingsGroup
        title="Discord account"
        aside={saving ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      >
        <SettingsRow
          label={linked ? `Linked to ${status.discordName ?? 'your Discord account'}` : 'Not linked'}
          description={
            !status.enabled
              ? 'Discord DMs are switched off on pd2trader.com right now.'
              : linked
                ? 'The PD2 Trader bot DMs this Discord account.'
                : 'Link your Discord account under Settings › Account to get DMs.'
          }
          control={
            status.enabled && goTo ? (
              <Button type="button"
                size="sm"
                variant={linked ? 'ghost' : 'default'}
                onClick={() => goTo('Account')}>
                {linked ? 'Change' : 'Link Discord'}
              </Button>
            ) : null
          }
        />
        {status.lastDmFailure && (
          <div role="alert"
            className="flex items-start gap-2 px-4 py-3 text-xs text-destructive">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            <span>
              Last DM failed ({formatTime(status.lastDmFailure.at)}): {status.lastDmFailure.reason}.
              {status.lastDmFailure.code === 50007 &&
                ' Allow direct messages from members of the PD2 Trader server (Discord › Privacy Settings), then send a test DM.'}
            </span>
          </div>
        )}
        {linked && (
          <SettingsRow
            label="Test DM"
            description={
              testResult ? (
                <span className={testResult.ok ? 'text-success' : 'text-destructive'}>{testResult.text}</span>
              ) : (
                'Sends a DM now, so you can see it reaches you.'
              )
            }
            control={
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={testing}
                onClick={() => void test()}
              >
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send test DM
              </Button>
            }
          />
        )}
      </SettingsGroup>
      {error && (
        <p role="alert"
          className="px-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <SettingsGroup title="DM me about"
        dimmed={!linked}>
        {TYPE_ROWS.map((row) => (
          <SettingsRow
            key={row.type}
            label={row.label}
            description={row.description}
            control={
              <FormControl>
                <Switch
                  aria-label={row.label}
                  checked={prefs.types[row.type]}
                  onCheckedChange={(checked) => void save({ types: { [row.type]: checked } })}
                />
              </FormControl>
            }
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="When"
        dimmed={!linked}>
        <SettingsRow
          settingKey="discordAwayMinutes"
          label="Only when away for"
          description="Whispers, offers and chat messages DM you after this long without keyboard or mouse input (Windows). Elsewhere, choose Always."
          control={
            <Select
              value={String(prefs.awayMinutes)}
              onValueChange={(value) => void save({ awayMinutes: Number(value) })}
            >
              <SelectTrigger className="w-[140px]"
                aria-label="Away time before DMs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {awayOptions.map((minutes) => (
                  <SelectItem key={minutes}
                    value={String(minutes)}>
                    {awayLabel(minutes)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
        <SettingsRow
          label="Snooze"
          description={snoozed ? `No DMs until ${formatTime(snoozed)}.` : 'Pause every DM for a while.'}
          control={
            <>
              {SNOOZE_HOURS.map((hours) => (
                <Button
                  key={hours}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void save({ snoozedUntil: new Date(Date.now() + hours * 3_600_000).toISOString() })}
                >
                  {hours} h
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!snoozed}
                onClick={() => void save({ snoozedUntil: null })}
              >
                Off
              </Button>
            </>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Muted traders"
        dimmed={!linked}>
        <SettingsRow
          label="Never DM me about"
          description="Account or character names. Muted chats in the overlay are never reported either."
          layout="stacked"
          control={
            <form
              className="flex w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addMuted();
              }}
            >
              <Input
                value={mutedInput}
                placeholder="Name"
                aria-label="Trader to mute"
                onChange={(e) => setMutedInput(e.target.value)}
                className="h-8"
              />
              <Button type="submit"
                size="sm"
                variant="outline"
                disabled={!mutedInput.trim()}>
                Mute
              </Button>
            </form>
          }
        >
          {prefs.mutedTraders.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {prefs.mutedTraders.map((name) => (
                <li
                  key={name}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 py-0.5 pr-1 pl-2 text-xs"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Unmute ${name}`}
                    className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => void save({ mutedTraders: prefs.mutedTraders.filter((n) => n !== name) })}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SettingsRow>
      </SettingsGroup>
      <SettingsHint>
        The overlay reports whispers, offers and chat messages, so they DM you only while it runs and you are signed in.
        Market watch DMs come from pd2trader.com.
      </SettingsHint>
    </Form>
  );
}
