import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { Bell, BellOff, Bookmark, Check, LogIn, Pencil, Play, Plus, RotateCw, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showToast, undoToast } from '@/overlay';
import { useSignIn } from '@/hooks/useSignIn';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { type MarketStore, retrySavedSearchSync } from '@/pages/market/store/useMarketStore';
import { ITEM_TYPES } from '../lib/catalog';
import { groupOf, orBlockNumbers } from '../lib/stat-groups';
import { filterName } from './stat-text';
import type { MarketFilters, SavedSearch, StatFilter } from '../lib/types';
import { fieldInputClass } from './controls';
import { t, useTranslation } from '@/i18n';

const UNDO_MS = 6000;

/** One-line description of a search: item, type, rarity, stats, mode. */
export function describeFilters(f: MarketFilters): string {
  const parts: string[] = [];
  if (f.itemName) parts.push(f.itemName);
  if (f.typeCode) parts.push(ITEM_TYPES.find((t) => t.code === f.typeCode)?.label ?? t('market:filters.type'));
  if (f.rarity.length) parts.push(f.rarity.join('/'));
  const stats = f.stats.filter((s) => s.enabled);
  const row = (s: StatFilter) =>
    `${s.kind === 'corruption' ? t('market:describe.corrupted', { name: filterName(s) }) : filterName(s)}${s.min != null ? ` ≥${s.min}` : ''}`;
  const required = stats.filter((s) => groupOf(s) === 'and').map(row);
  for (const block of orBlockNumbers(stats))
    required.push(
      t('market:describe.anyOf', {
        rows: stats
          .filter((s) => !s.not && s.or === block)
          .map(row)
          .join(' / '),
      }),
    );
  const excluded = stats.filter((s) => s.not).map(row);
  if (excluded.length) required.push(t('market:describe.noneOf', { rows: excluded.join(' / ') }));
  if (required.length) parts.push(required.join(', '));
  if (f.sellerName) parts.push(t('market:describe.seller', { name: f.sellerName }));
  parts.push(
    `${f.hardcore ? 'HC' : 'SC'} ${f.ladder ? 'L' : 'NL'}${f.source === 'archive' ? t('market:describe.sold') : ''}`,
  );
  return parts.join(' · ');
}

export interface SavedSearchesProps {
  store: MarketStore;
  current: MarketFilters;
  onRun: (search: SavedSearch) => void;
}

/** Saved tab: run, rename, delete, live-alert toggle and "save current search". */
export function SavedSearches({ store, current, onRun }: SavedSearchesProps) {
  const { t } = useTranslation(['market', 'common']);
  const [name, setName] = useState('');
  const { openSignIn } = useSignIn();
  const alerting = store.savedSearches.filter((s) => s.alert).length;
  const synced = store.syncStatus === 'ready';
  // Opening the tab retries a failed load right away
  useEffect(() => {
    retrySavedSearchSync();
  }, []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!store.saveSearch(trimmed, current)) return;
    setName('');
    showToast({ title: t('saved.savedToast'), description: trimmed, variant: 'success' });
  };

  const remove = (search: SavedSearch) => {
    const removed = store.removeSearch(search.id);
    if (!removed) return;
    undoToast({
      title: t('saved.deletedToast'),
      description: removed.name,
      duration: UNDO_MS,
      onUndo: () => store.restoreSearch(removed),
    });
  };

  const toggleAlert = (search: SavedSearch, on: boolean) => {
    if (!store.setSearchAlert(search.id, on)) {
      showToast({
        title: t('saved.tooManyTitle'),
        description: t('saved.tooManyDescription', { count: store.limits.maxAlerting }),
        variant: 'warning',
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form onSubmit={save}
        className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <Input
          aria-label={t('saved.nameLabel')}
          placeholder={t('saved.namePlaceholder', { description: describeFilters(current) })}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(fieldInputClass, 'flex-1')}
        />
        <Button
          type="submit"
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={!name.trim() || !synced}
          title={synced ? undefined : t('saved.needsSync')}
        >
          <Plus className="size-3.5" />
          {t('common:actions.save')}
        </Button>
      </form>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{t('saved.alertingSummary', { alerting, max: store.limits.maxAlerting })}</span>
        <label className="flex items-center gap-1.5">
          {t('saved.alerts')}
          <Switch
            checked={store.alertsEnabled}
            onCheckedChange={store.setAlertsEnabled}
            aria-label={t('saved.enableAlerts')}
            className="scale-75"
          />
        </label>
      </div>
      {store.syncStatus === 'signedOut' ? (
        <EmptyState
          className="m-4"
          icon={<Bookmark />}
          title={t('saved.signInTitle')}
          description={t('saved.signInDescription')}
        />
      ) : store.syncStatus === 'unauthorized' ? (
        <EmptyState
          className="m-4"
          icon={<Bookmark />}
          title={t('saved.reauthTitle')}
          description={t('saved.reauthDescription')}
          action={
            <Button size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={openSignIn}>
              <LogIn className="size-3.5" />
              {t('common:actions.signIn')}
            </Button>
          }
        />
      ) : store.syncStatus === 'loading' && store.savedSearches.length === 0 ? (
        <EmptyState className="m-4"
          icon={<Bookmark />}
          title={t('saved.loading')} />
      ) : store.syncStatus === 'error' && store.savedSearches.length === 0 ? (
        <EmptyState
          className="m-4"
          icon={<Bookmark />}
          title={t('saved.loadFailedTitle')}
          description={t('saved.loadFailedDescription')}
          action={
            <Button size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={retrySavedSearchSync}>
              <RotateCw className="size-3.5" />
              {t('saved.retryNow')}
            </Button>
          }
        />
      ) : store.savedSearches.length === 0 ? (
        <EmptyState
          className="m-4"
          icon={<Bookmark />}
          title={t('saved.emptyTitle')}
          description={t('saved.emptyDescription')}
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
          <ul className="divide-y divide-border/50">
            {store.savedSearches.map((s) => (
              <SavedRow
                key={s.id}
                search={s}
                onRun={() => onRun(s)}
                onRename={(n) => store.renameSearch(s.id, n)}
                onRemove={() => remove(s)}
                onAlert={(on) => toggleAlert(s, on)}
                alertsEnabled={store.alertsEnabled}
              />
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}

function SavedRow({
  search,
  onRun,
  onRename,
  onRemove,
  onAlert,
  alertsEnabled,
}: {
  search: SavedSearch;
  onRun: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onAlert: (on: boolean) => void;
  alertsEnabled: boolean;
}) {
  const { t } = useTranslation('market');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(search.name);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== search.name) onRename(trimmed);
    setEditing(false);
  };
  return (
    <li className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30">
      <Button
        variant="ghost"
        size="sm"
        className="size-7 shrink-0 p-0 text-primary"
        aria-label={t('saved.run', { name: search.name })}
        onClick={onRun}
      >
        <Play className="size-3.5" />
      </Button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              commit();
            }}
          >
            <Input
              autoFocus
              aria-label={t('saved.searchName')}
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setDraft(search.name);
                  setEditing(false);
                }
              }}
              className={fieldInputClass}
            />
            <Button type="submit"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              aria-label={t('saved.saveName')}>
              <Check className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              aria-label={t('saved.cancelRename')}
              onClick={() => {
                setDraft(search.name);
                setEditing(false);
              }}
            >
              <X className="size-3.5" />
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onRun}
            className="block w-full min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <div className="truncate text-sm font-medium">{search.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {t('saved.rowDescription', {
                description: describeFilters(search.filters),
                saved: moment(search.createdAt).fromNow(),
              })}
            </div>
          </button>
        )}
      </div>
      {!editing && (
        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t('saved.rename', { name: search.name })}
          onClick={() => {
            setDraft(search.name);
            setEditing(true);
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
      <label
        className="flex shrink-0 items-center gap-1"
        title={alertsEnabled ? t('saved.toastNewMatches') : t('saved.alertsOff')}
      >
        {search.alert && alertsEnabled ? (
          <Bell className="size-3.5 text-primary" />
        ) : (
          <BellOff className="size-3.5 text-muted-foreground" />
        )}
        <Switch
          checked={search.alert}
          onCheckedChange={onAlert}
          aria-label={t('saved.alertsFor', { name: search.name })}
          className="scale-75"
        />
      </label>
      <Button
        variant="ghost"
        size="sm"
        className="size-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
        aria-label={t('saved.delete', { name: search.name })}
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
