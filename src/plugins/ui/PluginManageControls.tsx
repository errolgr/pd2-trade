import React, { useState } from 'react';
import { ArrowUpCircle, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { Badge, Button, Switch, cn } from '@pd2-trader/ui';
import { confirmToast, showToast } from '@/overlay';
import { useTranslation } from '@/i18n';
import { pluginHost, type PluginView } from '../host/manager';

/**
 * Installed-plugin management controls shared by the Plugins panel (Installed tab) and Settings → Plugins:
 * status/source badges, the enable switch, uninstall (confirmed) and re-consent for a held update.
 */

type Tone = 'success' | 'warning' | 'destructive' | 'muted';

const TONE_CLASS: Record<Tone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
  muted: 'border-border text-muted-foreground',
};

function statusOf(view: PluginView): { key: string; tone: Tone } {
  const { installed, status } = view;
  if (!installed.enabled) {
    if (installed.disabledReason === 'blocklisted') return { key: 'blocked', tone: 'destructive' };
    if (installed.disabledReason === 'failures') return { key: 'failed', tone: 'warning' };
    if (installed.disabledReason === 'incompatible' || installed.disabledReason === 'invalid')
      return { key: 'incompatible', tone: 'warning' };
    return { key: 'off', tone: 'muted' };
  }
  if (status === 'error') return { key: 'error', tone: 'destructive' };
  if (status === 'starting') return { key: 'starting', tone: 'muted' };
  if (status === 'running') return { key: 'on', tone: 'success' };
  return { key: 'stopped', tone: 'muted' };
}

export function PluginStatusBadge({ view, className }: { view: PluginView; className?: string }) {
  const { t } = useTranslation('plugins');
  const { key, tone } = statusOf(view);
  return (
    <Badge variant="outline"
      className={cn(TONE_CLASS[tone], className)}>
      {t(`marketplace.manage.status.${key}`)}
    </Badge>
  );
}

export function PluginSourceBadge({ view, className }: { view: PluginView; className?: string }) {
  const { t } = useTranslation('plugins');
  const dev = view.installed.source.kind === 'dev';
  return (
    <Badge variant="outline"
      className={cn(TONE_CLASS.muted, className)}>
      {dev ? <Wrench aria-hidden /> : <ShieldCheck aria-hidden />}
      {dev ? t('consent.unpacked') : t('consent.signed')}
    </Badge>
  );
}

/** Why the plugin is off or failing, in plain language; null when there is nothing to say. */
export function PluginStatusText({ view, className }: { view: PluginView; className?: string }) {
  const { t } = useTranslation('plugins');
  const { installed } = view;
  let text: string | null = null;
  if (!installed.enabled && installed.disabledReason && installed.disabledReason !== 'user')
    text = t(`marketplace.manage.reason.${installed.disabledReason}`);
  else if (view.status === 'error' && view.error) text = view.error;
  if (!text) return null;
  return <p className={cn('text-xs text-muted-foreground', className)}>{text}</p>;
}

export function PluginEnableSwitch({ view }: { view: PluginView }) {
  const { t } = useTranslation('plugins');
  const { installed } = view;
  const locked = installed.disabledReason === 'blocklisted' || installed.disabledReason === 'incompatible';
  return (
    <Switch
      checked={installed.enabled}
      disabled={locked}
      aria-label={t('marketplace.manage.enable', { name: installed.name })}
      onCheckedChange={(enabled) => void pluginHost.setEnabled(installed.id, enabled)}
    />
  );
}

export function UninstallPluginButton({ view }: { view: PluginView }) {
  const { t } = useTranslation('plugins');
  const { installed } = view;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="size-8 p-0 text-muted-foreground hover:text-destructive"
      aria-label={t('marketplace.manage.uninstall', { name: installed.name })}
      title={t('marketplace.manage.uninstall', { name: installed.name })}
      onClick={() =>
        confirmToast({
          title: t('marketplace.manage.uninstallTitle', { name: installed.name }),
          description: t('marketplace.manage.uninstallHint'),
          confirmLabel: t('marketplace.manage.uninstallConfirm'),
          variant: 'warning',
          onConfirm: () => pluginHost.uninstall(installed.id),
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

/** Re-consent for an update held because it asks for more access; renders nothing without one. */
export function ReviewUpdateButton({ view }: { view: PluginView }) {
  const { t } = useTranslation('plugins');
  const [pending, setPending] = useState(false);
  const update = view.installed.pendingUpdate;
  if (!update) return null;
  const review = async () => {
    setPending(true);
    try {
      await pluginHost.approveUpdate(view.installed.id);
    } catch (error) {
      showToast({
        title: t('marketplace.manage.updateFailed'),
        description: error instanceof Error ? error.message : String(error),
        variant: 'error',
      });
    } finally {
      setPending(false);
    }
  };
  return (
    <Button variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => void review()}>
      <ArrowUpCircle className="size-4" />
      {t('marketplace.manage.reviewUpdate', { version: update.version })}
    </Button>
  );
}
