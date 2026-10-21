import React, { useState } from 'react';
import moment from 'moment';
import { Bell, BellOff, Bookmark, Check, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showToast, undoToast } from '@/overlay';
import { EmptyState } from '@/pages/currency/components/StatePanel';
import { MAX_ALERT_SEARCHES, type MarketStore } from '@/pages/market/store/useMarketStore';
import { ITEM_TYPES } from '../lib/catalog';
import { statName } from './stat-text';
import type { MarketFilters, SavedSearch } from '../lib/types';
import { fieldInputClass } from './controls';

const UNDO_MS = 6000;

/** One-line description of a search: item, type, rarity, stats, mode. */
export function describeFilters(f: MarketFilters): string {
  const parts: string[] = [];
  if (f.itemName) parts.push(f.itemName);
  if (f.typeCode) parts.push(ITEM_TYPES.find((t) => t.code === f.typeCode)?.label ?? 'Type');
  if (f.rarity.length) parts.push(f.rarity.join('/'));
  const stats = f.stats.filter((s) => s.enabled);
  if (stats.length) parts.push(stats.map((s) => `${statName(s.key)}${s.min != null ? ` ≥${s.min}` : ''}`).join(', '));
  if (f.sellerName) parts.push(`seller ${f.sellerName}`);
  parts.push(`${f.hardcore ? 'HC' : 'SC'} ${f.ladder ? 'L' : 'NL'}${f.source === 'archive' ? ' · sold' : ''}`);
  return parts.join(' · ');
}

export interface SavedSearchesProps {
  store: MarketStore;
  current: MarketFilters;
  onRun: (search: SavedSearch) => void;
}

/** Saved tab: run, rename, delete, live-alert toggle and "save current search". */
export function SavedSearches({ store, current, onRun }: SavedSearchesProps) {
  const [name, setName] = useState('');
  const alerting = store.savedSearches.filter((s) => s.alert).length;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    store.saveSearch(trimmed, current);
    setName('');
    showToast({ title: 'Search saved', description: trimmed, variant: 'success' });
  };

  const remove = (search: SavedSearch) => {
    const removed = store.removeSearch(search.id);
    if (!removed) return;
    undoToast({
      title: 'Search deleted',
      description: removed.name,
      duration: UNDO_MS,
      onUndo: () => store.restoreSearch(removed),
    });
  };

  const toggleAlert = (search: SavedSearch, on: boolean) => {
    if (!store.setSearchAlert(search.id, on)) {
      showToast({
        title: 'Too many alerts',
        description: `Up to ${MAX_ALERT_SEARCHES} saved searches can alert at once. Turn one off first.`,
        variant: 'warning',
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <form onSubmit={save}
        className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <Input
          aria-label="Name for the current search"
          placeholder={`Save current search… (${describeFilters(current)})`}
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(fieldInputClass, 'flex-1')}
        />
        <Button type="submit"
          size="sm"
          className="h-7 px-2.5 text-xs"
          disabled={!name.trim()}>
          <Plus className="size-3.5" />
          Save
        </Button>
      </form>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{`${alerting}/${MAX_ALERT_SEARCHES} alerting · checked every 15 s while the overlay runs`}</span>
        <label className="flex items-center gap-1.5">
          Alerts
          <Switch
            checked={store.alertsEnabled}
            onCheckedChange={store.setAlertsEnabled}
            aria-label="Enable live alerts"
            className="scale-75"
          />
        </label>
      </div>
      {store.savedSearches.length === 0 ? (
        <EmptyState
          className="m-4"
          icon={<Bookmark />}
          title="No saved searches"
          description="Set up filters on the Search tab, then save them here to rerun with a click or get toasts for new listings."
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
        aria-label={`Run ${search.name}`}
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
              aria-label="Search name"
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
              aria-label="Save name">
              <Check className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              aria-label="Cancel rename"
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
              {`${describeFilters(search.filters)} · saved ${moment(search.createdAt).fromNow()}`}
            </div>
          </button>
        )}
      </div>
      {!editing && (
        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Rename ${search.name}`}
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
        title={alertsEnabled ? 'Toast new matches' : 'Alerts are off (switch above)'}
      >
        {search.alert && alertsEnabled ? (
          <Bell className="size-3.5 text-primary" />
        ) : (
          <BellOff className="size-3.5 text-muted-foreground" />
        )}
        <Switch
          checked={search.alert}
          onCheckedChange={onAlert}
          aria-label={`Alerts for ${search.name}`}
          className="scale-75"
        />
      </label>
      <Button
        variant="ghost"
        size="sm"
        className="size-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${search.name}`}
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}
