import React from 'react';
import { ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Banner,
  Button,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import type { PluginView } from '../../host/manager';
import type { ListingDetail } from '../../marketplace/api';
import { accessDiff, needsReconsent, versionsBetween } from '../../marketplace/updates';
import type { Installer } from './installer';
import { AccessChanges, CompatibilityNote } from './parts';
import { SanitizedHtml } from './SanitizedHtml';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/**
 * What an update to the latest version changes before it is applied: the cumulative access diff (installed
 * manifest → latest version) and the changelog of every version in between. Updates that add a permission or a
 * host go through the consent sheet (held until re-consent).
 */
export function UpdateSheet({
  view,
  detail,
  installer,
  onOpenChange,
}: {
  view: PluginView | null;
  detail: ListingDetail | null;
  installer: Installer;
  onOpenChange: (open: boolean) => void;
}) {
  const open = !!view && !!detail;
  return (
    <Sheet open={open}
      onOpenChange={onOpenChange}>
      {open && (
        <SheetContent side="right"
          className="w-sidebar gap-0 p-0 text-xs sm:max-w-sidebar">
          <UpdateSheetBody view={view}
            detail={detail}
            installer={installer}
            onDone={() => onOpenChange(false)} />
        </SheetContent>
      )}
    </Sheet>
  );
}

function UpdateSheetBody({
  view,
  detail,
  installer,
  onDone,
}: {
  view: PluginView;
  detail: ListingDetail;
  installer: Installer;
  onDone: () => void;
}) {
  const { t } = useTranslation('plugins');
  const installed = view.installed;
  const latest = detail.latestVersion ?? installed.version;
  const target = detail.versions.find((v) => v.version === latest);
  // The installed manifest (what this version declares); the stored grant when the bundle failed to load.
  const from = view.manifest
    ? { permissions: view.manifest.permissions ?? [], network: view.manifest.network ?? [] }
    : installed.granted;
  const diff = accessDiff(from, target ?? detail);
  const reconsent = needsReconsent(diff);
  const between = versionsBetween(detail.versions, installed.version, latest);
  const busy = installer.pending === installed.id;
  const incompatible = (target?.compatible ?? detail.compatible) === false;

  return (
    <>
      <SheetHeader className="gap-1 border-b border-border p-3 pr-10">
        <SheetTitle className="text-sm">{t('marketplace.update.title', { name: detail.name })}</SheetTitle>
        <SheetDescription className="flex items-center gap-1.5 text-xs tabular-nums">
          v{installed.version}
          <ArrowRight className="size-3"
            aria-hidden />
          <span className="font-medium text-foreground">v{latest}</span>
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {reconsent ? (
            <Banner tone="warning"
              icon={<ShieldAlert />}
              className="text-xs">
              {t('marketplace.update.reconsent')}
            </Banner>
          ) : (
            <Banner tone="info"
              icon={<ShieldCheck />}
              className="text-xs">
              {t('marketplace.update.noNewAccess')}
            </Banner>
          )}
          <CompatibilityNote
            listing={{ compatible: target?.compatible ?? detail.compatible, sdk: target?.sdk ?? detail.sdk }}
          />

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">{t('marketplace.update.access')}</h3>
            <AccessChanges changes={diff} />
            {!reconsent && !diff.permissionsRemoved.length && !diff.hostsRemoved.length && (
              <p className="text-muted-foreground">{t('marketplace.update.sameAccess')}</p>
            )}
          </section>

          <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold">{t('marketplace.update.whatsNew')}</h3>
            {between.length === 0 ? (
              <p className="text-muted-foreground">{t('marketplace.detail.noChangelog')}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {between.map((v) => {
                  const at = Date.parse(v.publishedAt);
                  return (
                    <li key={v.version}
                      className="flex flex-col gap-1 rounded-md border border-border bg-card/60 p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium tabular-nums">v{v.version}</span>
                        {!Number.isNaN(at) && (
                          <span className="ml-auto text-2xs text-muted-foreground">{dateFormat.format(at)}</span>
                        )}
                      </div>
                      {v.changelogHtml ? (
                        <SanitizedHtml html={v.changelogHtml} />
                      ) : (
                        <p className="text-muted-foreground">{t('marketplace.detail.noChangelog')}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </ScrollArea>
      <SheetFooter className="flex-row justify-end gap-2 border-t border-border p-2.5">
        <Button size="sm"
          variant="ghost"
          onClick={onDone}>
          {t('consent.cancel')}
        </Button>
        <Button
          size="sm"
          disabled={installer.pending !== null || incompatible}
          onClick={() => void installer.update(detail).then((ok) => ok && onDone())}
        >
          {busy
            ? t('marketplace.update.updating')
            : reconsent
              ? t('marketplace.update.reviewAndUpdate')
              : t('marketplace.update.now', { version: latest })}
        </Button>
      </SheetFooter>
    </>
  );
}
