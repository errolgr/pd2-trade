import React from 'react';
import { Globe, Lock, Puzzle, ShieldCheck, Wrench } from 'lucide-react';
import { PERMISSION_INFO, type Permission } from '@pd2-trader/plugin-sdk';
import { PanelChrome, PanelSurface, Badge, Button, ScrollArea } from '@pd2-trader/ui';
import { usePanel } from '@/overlay';
import { useTranslation } from '@/i18n';
import { pluginHost } from '../host/manager';
import { usePluginHost } from './hooks';
import { permissionKey } from './permission-labels';

/**
 * Consent sheet (PRD C1.3): what a plugin may do, in plain language, before install and again before an
 * update (or hot reload) that asks for more. Opened by the plugin host whenever a request is pending.
 */
export default function PluginConsentPage() {
  const { t } = useTranslation('plugins');
  const { close } = usePanel<'pluginConsent'>();
  const { consent } = usePluginHost();

  if (!consent) return null;
  const { manifest, kind, source, added } = consent;
  const permissions = kind === 'install' ? manifest.permissions : added.permissions;
  const network = kind === 'install' ? manifest.network : added.network;
  const prompted = permissions.filter((p) => PERMISSION_INFO[p].consent === 'prompt');
  const silent = permissions.filter((p) => PERMISSION_INFO[p].consent === 'silent');
  const answer = (allow: boolean) => {
    pluginHost.answerConsent(consent.id, allow);
    if (!pluginHost.getSnapshot().consent) close();
  };

  return (
    <PanelSurface className="flex h-full w-full flex-col">
      <PanelChrome
        title={kind === 'install' ? t('consent.installTitle') : t('consent.updateTitle')}
        icon={<ShieldCheck />}
        onClose={() => answer(false)}
      />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Puzzle className="size-4"
                aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold">{manifest.name}</span>
                <span className="tabular-nums text-muted-foreground">{manifest.version}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {manifest.author && <span className="truncate">{manifest.author}</span>}
                {source.kind === 'dev' ? (
                  <Badge variant="outline"
                    className="gap-1 rounded-sm px-1.5 py-0 text-xs text-warning">
                    <Wrench aria-hidden />
                    {t('consent.unpacked')}
                  </Badge>
                ) : (
                  <Badge variant="outline"
                    className="gap-1 rounded-sm px-1.5 py-0 text-xs text-success">
                    <ShieldCheck aria-hidden />
                    {t('consent.signed')}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {kind === 'update' && <p className="text-muted-foreground">{t('consent.updateIntro')}</p>}

          {(prompted.length > 0 || network.length > 0) && (
            <section className="flex flex-col gap-1.5">
              <h3 className="font-semibold">{t('consent.asks')}</h3>
              <ul className="flex flex-col gap-1.5">
                {prompted.map((p) => (
                  <PermissionLine key={p}
                    permission={p} />
                ))}
                {network.map((host) => (
                  <li
                    key={host}
                    className="flex items-start gap-2 rounded-md border border-warning/35 bg-warning/10 p-2"
                  >
                    <Globe className="mt-0.5 size-3.5 shrink-0 text-warning"
                      aria-hidden />
                    <span>
                      <span className="font-medium">{t('consent.network', { host })}</span>
                      <span className="block text-muted-foreground">{t('consent.networkHint')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {silent.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="font-semibold text-muted-foreground">{t('consent.alsoUses')}</h3>
              <ul className="flex flex-col gap-0.5 text-muted-foreground">
                {silent.map((p) => (
                  <li key={p}>{t(permissionKey(p, 'label'))}</li>
                ))}
              </ul>
            </section>
          )}

          {permissions.length === 0 && network.length === 0 && (
            <p className="text-muted-foreground">{t('consent.nothing')}</p>
          )}

          <p className="flex items-start gap-2 rounded-md bg-muted p-2 text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0"
              aria-hidden />
            {t('consent.never')}
          </p>
        </div>
      </ScrollArea>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border p-2.5">
        <Button size="sm"
          variant="ghost"
          onClick={() => answer(false)}>
          {t('consent.cancel')}
        </Button>
        <Button size="sm"
          onClick={() => answer(true)}>
          {kind === 'install' ? t('consent.allowInstall') : t('consent.allowUpdate')}
        </Button>
      </div>
    </PanelSurface>
  );
}

function PermissionLine({ permission }: { permission: Permission }) {
  const { t } = useTranslation('plugins');
  return (
    <li className="flex items-start gap-2 rounded-md border border-border bg-card/60 p-2">
      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        aria-hidden />
      <span>
        <span className="font-medium">{t(permissionKey(permission, 'label'))}</span>
        <span className="block text-muted-foreground">{t(permissionKey(permission, 'description'))}</span>
      </span>
    </li>
  );
}
