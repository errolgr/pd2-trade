import React, { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArrowUpCircle, Puzzle } from 'lucide-react';
import {
  PanelChrome,
  PanelSurface,
  Badge,
  Button,
  Input,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  EmptyState,
  cn,
} from '@pd2-trader/ui';
import { usePanel } from '@/overlay';
import { useTranslation } from '@/i18n';
import type { PluginView } from '../host/manager';
import { marketplaceApi, type Listing, type ListingDetail } from '../marketplace/api';
import { listingState } from '../marketplace/listing-state';
import { hasUpdate } from '../marketplace/updates';
import { marketplace } from '../PluginHostBridge';
import { usePluginHost } from './hooks';
import { DiscoverHome, NO_FILTERS, SearchResults, isBrowsingHome, type BrowseFilters } from './market/Browse';
import { useDiscover, useInstalledDetails, useLoaded, usePd2Token } from './market/data';
import { useInstaller, type Installer } from './market/installer';
import type { ListingHandlers } from './market/ListingCard';
import { ListingDetailView } from './market/ListingDetailView';
import { CardSkeleton } from './market/LoadError';
import { AccessChips, CHIP_BADGE, ListingIcon } from './market/parts';
import { UpdateSheet } from './market/UpdateSheet';
import {
  PluginEnableSwitch,
  PluginSourceBadge,
  PluginStatusBadge,
  PluginStatusText,
  ReviewUpdateButton,
  UninstallPluginButton,
} from './PluginManageControls';

/**
 * `plugins` panel (PRD C1.1, marketplace v2): discover home (collections, popular/new/updated shelves,
 * categories), search with sort and category filters, a listing's page (screenshots, description, access,
 * reviews, versions + changelogs), verified install through the consent sheet, and the installed plugins with
 * update badges and the update sheet (access diff + changelogs; more access → re-consent).
 */

type Tab = 'browse' | 'installed';

const SEARCH_DEBOUNCE_MS = 300;
const TRIGGER_CLASS = 'h-6 px-2.5 text-xs after:hidden data-[state=active]:bg-background data-[state=active]:shadow-sm';

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export default function PluginsPage() {
  const { t } = useTranslation('plugins');
  const { payload, payloadVersion, close } = usePanel<'plugins'>();
  const host = usePluginHost();
  const token = usePd2Token();
  const [tab, setTab] = useState<Tab>(payload?.tab ?? 'browse');
  const [query, setQuery] = useState(payload?.q ?? '');
  const [filters, setFilters] = useState<BrowseFilters>(NO_FILTERS);
  const [detailId, setDetailId] = useState<string | null>(payload?.pluginId ?? null);
  const [updateId, setUpdateId] = useState<string | null>(null);
  const installer = useInstaller();
  const discover = useDiscover();
  const installedDetails = useInstalledDetails(host.plugins);
  const q = useDebounced(query.trim(), SEARCH_DEBOUNCE_MS);
  // marketplace.blocklist is not a store: refresh it when the panel opens and re-render once applied.
  const [, setBlocklistVersion] = useState(0);

  useEffect(() => {
    setTab(payload?.tab ?? 'browse');
    if (payload?.q !== undefined) setQuery(payload.q);
    setDetailId(payload?.pluginId ?? null);
    // Only a new openPanel() call re-applies the payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadVersion]);

  useEffect(() => {
    let live = true;
    void marketplace.checkBlocklist().then(() => live && setBlocklistVersion((v) => v + 1));
    return () => {
      live = false;
    };
  }, []);

  const installedById = new Map(host.plugins.map((p) => [p.installed.id, p]));
  const handlers: ListingHandlers = {
    stateOf: (listing: Pick<Listing, 'id' | 'latestVersion'>) =>
      listingState(listing, installedById.get(listing.id)?.installed, marketplace.blocklist),
    installer,
    onOpen: setDetailId,
    onUpdate: setUpdateId,
  };
  const details = installedDetails.status === 'ok' ? installedDetails.data : {};
  const updates = host.plugins.filter(
    (p) =>
      p.installed.source.kind === 'marketplace' &&
      hasUpdate(p.installed.version, details[p.installed.id]?.latestVersion),
  );
  const changeFilters = (next: BrowseFilters) => {
    setFilters(next);
    setDetailId(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <PanelSurface animate
        className="flex h-full w-full flex-col">
        <PanelChrome
          title={t('marketplace.title')}
          icon={<Puzzle className="text-primary" />}
          onClose={close}
          closeLabel={t('marketplace.closeLabel')}
          center={
            tab === 'browse' && (
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDetailId(null);
                }}
                placeholder={t('marketplace.search')}
                aria-label={t('marketplace.search')}
                className="h-7 w-64 text-xs"
              />
            )
          }
          actions={
            <Tabs value={tab}
              onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="browse"
                  className={TRIGGER_CLASS}>
                  {t('marketplace.tabs.browse')}
                </TabsTrigger>
                <TabsTrigger value="installed"
                  className={TRIGGER_CLASS}>
                  {t('marketplace.tabs.installed')}
                  {host.plugins.length > 0 && (
                    <span className="ml-1 text-xs tabular-nums text-muted-foreground">{host.plugins.length}</span>
                  )}
                  {updates.length > 0 && (
                    <Badge
                      variant="count"
                      className="ml-1"
                      title={t('marketplace.update.count', { count: updates.length })}
                    >
                      {updates.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-3 text-xs">
            {tab === 'installed' ? (
              <InstalledList
                plugins={host.plugins}
                ready={host.ready}
                details={details}
                onBrowse={() => setTab('browse')}
                onOpen={(id) => {
                  setTab('browse');
                  setDetailId(id);
                }}
                onUpdate={setUpdateId}
              />
            ) : detailId ? (
              <ListingDetailView
                key={detailId}
                id={detailId}
                installed={installedById.get(detailId)?.installed}
                handlers={handlers}
                token={token}
                onBack={() => setDetailId(null)}
                onTag={(tag) => changeFilters({ ...NO_FILTERS, tag })}
              />
            ) : isBrowsingHome(q, filters) ? (
              <DiscoverHome discover={discover}
                handlers={handlers}
                onFilters={changeFilters} />
            ) : (
              <SearchResults
                q={q}
                filters={filters}
                discover={discover}
                handlers={handlers}
                onFilters={changeFilters}
              />
            )}
          </div>
        </ScrollArea>
        <UpdateSheetFor
          id={updateId}
          view={updateId ? (installedById.get(updateId) ?? null) : null}
          installer={installer}
          onClose={() => {
            setUpdateId(null);
            installedDetails.reload();
          }}
        />
      </PanelSurface>
    </MotionConfig>
  );
}

/** The update sheet for one installed plugin, with a fresh listing detail (versions and their changelogs). */
function UpdateSheetFor({
  id,
  view,
  installer,
  onClose,
}: {
  id: string | null;
  view: PluginView | null;
  installer: Installer;
  onClose: () => void;
}) {
  const detail = useLoaded<ListingDetail>(id, () => marketplaceApi.get(id as string));
  return (
    <UpdateSheet
      view={view}
      detail={detail.status === 'ok' ? detail.data : null}
      installer={installer}
      onOpenChange={(open) => !open && onClose()}
    />
  );
}

// ---- installed ----------------------------------------------------------------------------------------------

function InstalledList({
  plugins,
  ready,
  details,
  onBrowse,
  onOpen,
  onUpdate,
}: {
  plugins: PluginView[];
  ready: boolean;
  details: Record<string, ListingDetail>;
  onBrowse: () => void;
  onOpen: (id: string) => void;
  onUpdate: (id: string) => void;
}) {
  const { t } = useTranslation('plugins');
  if (!ready)
    return (
      <div className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  if (plugins.length === 0)
    return (
      <EmptyState
        icon={<Puzzle />}
        title={t('marketplace.emptyInstalled')}
        description={t('marketplace.emptyInstalledHint')}
        action={
          <Button size="sm"
            onClick={onBrowse}>
            {t('marketplace.browse')}
          </Button>
        }
      />
    );
  return (
    <ul className="flex flex-col gap-2">
      {plugins.map((view) => {
        const detail = details[view.installed.id];
        const marketplaceCopy = view.installed.source.kind === 'marketplace';
        const latest =
          marketplaceCopy && hasUpdate(view.installed.version, detail?.latestVersion) ? detail.latestVersion : null;
        return (
          <li
            key={view.installed.id}
            className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-2.5"
          >
            <ListingIcon listing={{ iconUrl: detail?.iconUrl ?? null }} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {marketplaceCopy ? (
                  <Button
                    variant="link"
                    className="h-auto truncate p-0 text-sm font-semibold text-foreground"
                    onClick={() => onOpen(view.installed.id)}
                  >
                    {view.installed.name}
                  </Button>
                ) : (
                  <span className="truncate text-sm font-semibold">{view.installed.name}</span>
                )}
                <span className="tabular-nums text-muted-foreground">{view.installed.version}</span>
                <PluginSourceBadge view={view}
                  className={CHIP_BADGE} />
                <PluginStatusBadge view={view}
                  className={CHIP_BADGE} />
                {latest && (
                  <Badge variant="secondary"
                    className={cn(CHIP_BADGE, 'shadow-glow')}>
                    <ArrowUpCircle aria-hidden />
                    {t('marketplace.update.badge')}
                  </Badge>
                )}
              </div>
              {view.manifest?.description && <p className="text-muted-foreground">{view.manifest.description}</p>}
              <PluginStatusText view={view} />
              {view.manifest && (
                <AccessChips
                  permissions={view.installed.granted.permissions}
                  network={view.installed.granted.network}
                />
              )}
              <div className="flex">
                {latest ? (
                  <Button variant="secondary"
                    size="sm"
                    onClick={() => onUpdate(view.installed.id)}>
                    <ArrowUpCircle className="size-4" />
                    {t('marketplace.update.view', { version: latest })}
                  </Button>
                ) : (
                  <ReviewUpdateButton view={view} />
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <PluginEnableSwitch view={view} />
              <UninstallPluginButton view={view} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
