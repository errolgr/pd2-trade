import React from 'react';
import { ExternalLink, Globe, Lock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getProfileSettings, ProfileSettings, updateProfileSettings } from '@/lib/networth-api';
import { BACKEND_URL } from '@/lib/pkce';
import { openUrl } from '@/lib/browser-opener';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

/**
 * Public profile on/off in the Net Worth panel header: the same leaderboard opt-in as Settings → Net Worth, saved
 * the same way (display name and holdings choice are kept). Renders nothing until the profile loads, so it stays out
 * of the way while leaderboards are off on the server (404) or the request fails.
 */
export const PublicProfileToggle: React.FC<{ token: string }> = ({ token }) => {
  const { t } = useTranslation('netWorth');
  const [profile, setProfile] = React.useState<ProfileSettings | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setProfile(null);
    getProfileSettings(token)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!profile) return null;

  const toggle = async (optedIn: boolean) => {
    const previous = profile;
    setProfile({ ...profile, optedIn });
    setSaving(true);
    setError(null);
    try {
      setProfile(
        await updateProfileSettings(token, {
          optedIn,
          showHoldings: previous.showHoldings,
          displayName: previous.displayName || undefined,
        }),
      );
    } catch (err) {
      setProfile(previous);
      setError(err instanceof Error ? err.message : t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const slug = profile.optedIn ? profile.slug : null;
  const Icon = profile.optedIn ? Globe : Lock;

  return (
    <div className="flex items-center gap-2 text-xs">
      <label
        className="flex min-w-0 cursor-pointer items-center gap-2"
        title={profile.optedIn ? t('profile.publicTooltip') : t('profile.privateTooltip')}
      >
        <Switch
          checked={profile.optedIn}
          disabled={saving}
          onCheckedChange={toggle}
          aria-label={t('profile.publicProfile')}
        />
        <Icon className={cn('size-3.5 shrink-0', profile.optedIn ? 'text-primary' : 'text-muted-foreground')} />
        <span className={profile.optedIn ? 'text-foreground' : 'text-muted-foreground'}>
          {profile.optedIn ? t('profile.publicProfile') : t('profile.private')}
        </span>
      </label>
      {error && (
        <span role="alert"
          className="truncate text-destructive"
          title={error}>
          {t('profile.couldNotSave')}
        </span>
      )}
      {slug && (
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => openUrl(`${BACKEND_URL}/u/${encodeURIComponent(slug)}`)}
        >
          <ExternalLink className="size-3" />
          {t('profile.viewProfile')}
        </button>
      )}
    </div>
  );
};
