import React from 'react';
import { useForm } from 'react-hook-form';
import { ExternalLink, Loader2, RotateCw } from 'lucide-react';
import { Form, FormControl, FormField } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOptions } from '@/hooks/useOptions';
import { getProfileSettings, NetWorthApiError, ProfileSettings, updateProfileSettings } from '@/lib/networth-api';
import { BACKEND_URL } from '@/lib/pkce';
import { openUrl } from '@/lib/browser-opener';
import { SettingsGroup, SettingsRow } from '../settings-ui';
import { useTranslation } from '@/i18n';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'not-live' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

type ProfileFormValues = { optedIn: boolean; displayName: string; showHoldings: boolean };

const toValues = (p: ProfileSettings): ProfileFormValues => ({
  optedIn: p.optedIn,
  displayName: p.displayName ?? p.displayNameOptions[0] ?? '',
  showHoldings: p.showHoldings,
});

/**
 * Leaderboard visibility, stored server-side per PD2 login (not in local settings).
 * Every change is saved immediately; on failure the controls snap back to the server state.
 */
export function PublicProfileGroup() {
  const { t } = useTranslation('settings');
  const { settings } = useOptions();
  const token = settings?.pd2Token ?? null;
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [profile, setProfile] = React.useState<ProfileSettings | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const form = useForm<ProfileFormValues>({ defaultValues: { optedIn: false, displayName: '', showHoldings: false } });

  const load = React.useCallback(async () => {
    if (!token) {
      setState({ kind: 'signed-out' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const p = await getProfileSettings(token);
      setProfile(p);
      form.reset(toValues(p));
      setState({ kind: 'ready' });
    } catch (err) {
      if (err instanceof NetWorthApiError && err.status === 404) setState({ kind: 'not-live' });
      else if (err instanceof NetWorthApiError && err.status === 401) setState({ kind: 'signed-out' });
      else setState({ kind: 'error', message: err instanceof Error ? err.message : t('publicProfile.loadFailed') });
    }
  }, [token, form, t]);

  React.useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Partial<ProfileFormValues>) => {
    if (!token) return;
    const next = { ...form.getValues(), ...patch };
    form.reset(next);
    setSaving(true);
    setSaveError(null);
    try {
      const p = await updateProfileSettings(token, {
        optedIn: next.optedIn,
        showHoldings: next.showHoldings,
        displayName: next.displayName || undefined,
      });
      setProfile(p);
      form.reset(toValues(p));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('publicProfile.saveFailed'));
      if (profile) form.reset(toValues(profile));
    } finally {
      setSaving(false);
    }
  };

  const optedIn = form.watch('optedIn');
  const ready = state.kind === 'ready';
  const status =
    state.kind === 'loading' ? (
      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
    ) : saving ? (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {t('publicProfile.saving')}
      </span>
    ) : null;

  const description = (() => {
    switch (state.kind) {
      case 'signed-out':
        return t('publicProfile.description.signedOut');
      case 'not-live':
        return t('publicProfile.description.notLive');
      case 'error':
        return state.message;
      default:
        return t('publicProfile.description.default');
    }
  })();

  return (
    <Form {...form}>
      <SettingsGroup title={t('publicProfile.group')}
        aside={status}>
        <FormField
          control={form.control}
          name="optedIn"
          render={({ field }) => (
            <SettingsRow
              label={t('publicProfile.optedIn')}
              description={description}
              disabled={!ready}
              control={
                state.kind === 'error' ? (
                  <Button type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={load}>
                    <RotateCw className="size-3.5" />
                    {t('common:actions.retry')}
                  </Button>
                ) : (
                  <FormControl>
                    <Switch
                      checked={field.value}
                      disabled={!ready || saving}
                      onCheckedChange={(checked) => save({ optedIn: checked })}
                    />
                  </FormControl>
                )
              }
            >
              {saveError && <p className="text-xs font-medium text-destructive">{saveError}</p>}
            </SettingsRow>
          )}
        />
        {ready && optedIn && profile && (
          <>
            {profile.displayNameOptions.length > 1 && (
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <SettingsRow
                    label={t('publicProfile.displayName.label')}
                    description={t('publicProfile.displayName.description')}
                    control={
                      <Select
                        value={field.value}
                        disabled={saving}
                        onValueChange={(value) => save({ displayName: value })}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder={t('publicProfile.displayName.placeholder')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {profile.displayNameOptions.map((name) => (
                            <SelectItem key={name}
                              value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                )}
              />
            )}
            <FormField
              control={form.control}
              name="showHoldings"
              render={({ field }) => (
                <SettingsRow
                  label={t('publicProfile.showHoldings.label')}
                  description={t('publicProfile.showHoldings.description')}
                  control={
                    <FormControl>
                      <Switch
                        checked={field.value}
                        disabled={saving}
                        onCheckedChange={(checked) => save({ showHoldings: checked })}
                      />
                    </FormControl>
                  }
                />
              )}
            />
            {profile.slug && (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-xs text-muted-foreground">
                  pd2trader.com/u/<span className="text-foreground">{profile.slug}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => openUrl(`${BACKEND_URL}/u/${encodeURIComponent(profile.slug!)}`)}
                >
                  <ExternalLink className="size-3.5" />
                  {t('publicProfile.viewProfile')}
                </Button>
              </div>
            )}
          </>
        )}
      </SettingsGroup>
    </Form>
  );
}
