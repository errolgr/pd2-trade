import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { Badge, Banner, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, cn } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import { openUrl } from '@/lib/browser-opener';
import type { InstalledPlugin } from '../../host/types';
import type { ListingDetail } from '../../marketplace/api';
import { isBlocked } from '../../marketplace/install';
import { marketplace } from '../../PluginHostBridge';
import { permissionKey } from '../permission-labels';
import { useListingDetail } from './data';
import type { ListingHandlers } from './ListingCard';
import { LoadError } from './LoadError';
import {
  AccessChanges,
  CHIP_BADGE,
  CompatibilityNote,
  ListingAction,
  ListingIcon,
  ListingMeta,
  TONE_BADGE,
} from './parts';
import { ReportDialog } from './ReportDialog';
import { ReviewsSection } from './Reviews';
import { SanitizedHtml } from './SanitizedHtml';
import { ScreenshotGallery } from './ScreenshotGallery';

type DetailTab = 'overview' | 'reviews' | 'versions';

const TAB_TRIGGER = 'h-6 px-2.5 text-xs';
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** A listing's page: header + actions, then Overview (screenshots, description, access), Reviews and Versions. */
export function ListingDetailView({
  id,
  installed,
  handlers,
  token,
  onBack,
  onTag,
}: {
  id: string;
  installed: InstalledPlugin | undefined;
  handlers: ListingHandlers;
  token: string | null;
  onBack: () => void;
  onTag: (tag: string) => void;
}) {
  const { t } = useTranslation('plugins');
  const loaded = useListingDetail(id);
  const [tab, setTab] = useState<DetailTab>('overview');
  const error = handlers.installer.errors[id];

  return (
    <>
      <Button variant="ghost"
        size="sm"
        className="self-start"
        onClick={onBack}>
        <ArrowLeft className="size-4" />
        {t('marketplace.detail.back')}
      </Button>

      {loaded.status === 'error' ? (
        <LoadError title={t('marketplace.detail.loadFailed')}
          onRetry={loaded.retry} />
      ) : loaded.status === 'loading' ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2.5">
            <Skeleton className="size-12" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      ) : (
        <DetailBody
          detail={loaded.data}
          installed={installed}
          handlers={handlers}
          token={token}
          tab={tab}
          onTab={setTab}
          onTag={onTag}
          error={error}
        />
      )}
    </>
  );
}

function DetailBody({
  detail,
  installed,
  handlers,
  token,
  tab,
  onTab,
  onTag,
  error,
}: {
  detail: ListingDetail;
  installed: InstalledPlugin | undefined;
  handlers: ListingHandlers;
  token: string | null;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onTag: (tag: string) => void;
  error: string | undefined;
}) {
  const { t } = useTranslation('plugins');
  return (
    <>
      <header className="flex items-start gap-2.5">
        <ListingIcon listing={detail}
          size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-base font-semibold">{detail.name}</h2>
            {detail.latestVersion && (
              <span className="tabular-nums text-muted-foreground">v{detail.latestVersion}</span>
            )}
          </div>
          <ListingMeta listing={detail} />
          {detail.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {detail.tags.map((tag) => (
                <Button key={tag}
                  variant="quiet"
                  size="inline"
                  className="text-2xs"
                  onClick={() => onTag(tag)}>
                  #{tag}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ListingAction
            listing={detail}
            state={handlers.stateOf(detail)}
            installer={handlers.installer}
            onUpdate={() => handlers.onUpdate(detail.id)}
          />
          <ReportDialog token={token}
            target={{ kind: 'plugin', pluginId: detail.id, name: detail.name }} />
        </div>
      </header>
      {detail.summary && <p className="text-muted-foreground">{detail.summary}</p>}
      <CompatibilityNote listing={detail} />
      {error && (
        <Banner tone="destructive"
          role="alert"
          icon={<AlertTriangle />}>
          <span className="block font-medium">{t('marketplace.installFailed', { name: detail.name })}</span>
          <span className="block text-xs text-muted-foreground">{error}</span>
        </Banner>
      )}

      <Tabs value={tab}
        onValueChange={(v) => onTab(v as DetailTab)}
        className="gap-3">
        <TabsList className="h-7 self-start p-0.5">
          <TabsTrigger value="overview"
            className={TAB_TRIGGER}>
            {t('marketplace.detail.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="reviews"
            className={TAB_TRIGGER}>
            {t('marketplace.detail.tabs.reviews')}
            {detail.rating.count > 0 && (
              <Badge variant="count"
                className="ml-1">
                {detail.rating.count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="versions"
            className={TAB_TRIGGER}>
            {t('marketplace.detail.tabs.versions')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview"
          className="flex flex-col gap-3">
          <Overview detail={detail} />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsSection detail={detail}
            installed={installed}
            token={token} />
        </TabsContent>
        <TabsContent value="versions">
          <Versions detail={detail}
            installedVersion={installed?.version} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Overview({ detail }: { detail: ListingDetail }) {
  const { t } = useTranslation('plugins');
  return (
    <>
      <ScreenshotGallery screenshots={detail.screenshots}
        name={detail.name} />
      {detail.descriptionHtml && (
        <section className="flex flex-col gap-1.5"
          aria-label={t('marketplace.detail.about')}>
          <SanitizedHtml html={detail.descriptionHtml} />
        </section>
      )}
      <section className="flex flex-col gap-1.5">
        <h3 className="font-semibold">{t('marketplace.detail.access')}</h3>
        {detail.permissions.length === 0 && detail.network.length === 0 ? (
          <p className="text-muted-foreground">{t('consent.nothing')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {detail.permissions.map((p) => (
              <li key={p}
                className="flex items-start gap-2 rounded-md border border-border bg-card/60 p-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden />
                <span>
                  <span className="font-medium">{t(permissionKey(p, 'label'))}</span>
                  <span className="block text-muted-foreground">{t(permissionKey(p, 'description'))}</span>
                </span>
              </li>
            ))}
            {detail.network.map((host) => (
              <li key={host}
                className="flex items-start gap-2 rounded-md border border-warning/35 bg-warning/10 p-2">
                <Globe className="mt-0.5 size-3.5 shrink-0 text-warning"
                  aria-hidden />
                <span>
                  <span className="font-medium">{t('consent.network', { host })}</span>
                  <span className="block text-muted-foreground">{t('consent.networkHint')}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {detail.repo?.startsWith('https://') && (
        <Button
          variant="link"
          size="inline"
          className="self-start text-xs"
          onClick={() => void openUrl(detail.repo as string)}
        >
          <ExternalLink className="size-3.5" />
          {t('marketplace.detail.source')}
        </Button>
      )}
    </>
  );
}

function Versions({ detail, installedVersion }: { detail: ListingDetail; installedVersion?: string }) {
  const { t } = useTranslation('plugins');
  if (detail.versions.length === 0)
    return <p className="text-muted-foreground">{t('marketplace.detail.noVersions')}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {detail.versions.map((v) => {
        const blocked = !!isBlocked(marketplace.blocklist, detail.id, v.version);
        const date = Date.parse(v.publishedAt);
        return (
          <li key={v.version}
            className="flex flex-col gap-1.5 rounded-md border border-border bg-card/60 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium tabular-nums">v{v.version}</span>
              {v.version === detail.latestVersion && (
                <Badge variant="outline"
                  className={cn(TONE_BADGE.muted, CHIP_BADGE)}>
                  {t('marketplace.detail.latest')}
                </Badge>
              )}
              {v.version === installedVersion && (
                <Badge variant="outline"
                  className={cn(TONE_BADGE.success, CHIP_BADGE)}>
                  {t('marketplace.detail.current')}
                </Badge>
              )}
              {blocked && (
                <Badge variant="outline"
                  className={cn(TONE_BADGE.destructive, CHIP_BADGE)}>
                  {t('marketplace.blocked')}
                </Badge>
              )}
              {v.compatible === false && (
                <Badge variant="outline"
                  className={cn(TONE_BADGE.warning, CHIP_BADGE)}>
                  {t('marketplace.manage.status.incompatible')}
                </Badge>
              )}
              {!Number.isNaN(date) && (
                <span className="ml-auto text-2xs text-muted-foreground">
                  {t('marketplace.detail.published', { date: dateFormat.format(date) })}
                </span>
              )}
            </div>
            <AccessChanges changes={v.changes} />
            {v.changelogHtml ? (
              <SanitizedHtml html={v.changelogHtml} />
            ) : (
              <p className="text-muted-foreground">{t('marketplace.detail.noChangelog')}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
