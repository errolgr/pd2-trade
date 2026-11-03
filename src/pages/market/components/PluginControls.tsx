import React from 'react';
import { ArrowDownWideNarrow } from 'lucide-react';
import {
  Button,
  Toggle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
  ErrorChip,
  SlotAction,
  SlotBadge,
  slotToneClass,
} from '@pd2-trader/ui';
import { runPluginCommand, usePluginSlot } from '@/plugins/ui/hooks';
import { type PluginCell, toMarketQuery, toMarketRow } from '@/plugins/adapters/market';
import { useTranslation } from '@/i18n';
import type { MarketPlugins } from '../hooks/useMarketPlugins';
import type { MarketFilters, ScoredListing } from '../lib/types';

const DEFAULT_SORT = '';

/** Results toolbar: plugin filter toggles, the plugin sort menu and failed-slot chips; nothing without plugins. */
export function PluginControls({ plugins }: { plugins: MarketPlugins }) {
  const { t } = useTranslation('plugins');
  const { filters, sorts, sortId, failures } = plugins;
  if (!filters.length && !sorts.length && !failures.length) return null;
  const sortLabel = sorts.find((s) => s.pluginId === sortId)?.label;
  return (
    <>
      {failures.map((f) => (
        <ErrorChip key={f.key}
          message={`${f.pluginName}: ${f.error}`}
          onRetry={f.retry} />
      ))}
      {filters.map((f) => (
        <Toggle
          key={f.pluginId}
          variant="outline"
          size="sm"
          className="h-6 min-w-0 px-2 text-xs"
          pressed={f.active}
          onPressedChange={() => plugins.toggleFilter(f.pluginId)}
          aria-label={t('surfaces.market.filter', { label: f.label })}
          title={t('surfaces.market.filter', { label: f.label })}
        >
          {f.label}
        </Toggle>
      ))}
      {sorts.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-6 gap-1 px-2 text-xs', sortLabel && 'text-accent-foreground')}
            >
              <ArrowDownWideNarrow className="size-3.5" />
              {sortLabel ?? t('surfaces.market.sort')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('surfaces.market.sortBy')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortId ?? DEFAULT_SORT}
              onValueChange={(value) => plugins.setSortId(value === DEFAULT_SORT ? null : value)}
            >
              <DropdownMenuRadioItem value={DEFAULT_SORT}>{t('surfaces.market.sortDefault')}</DropdownMenuRadioItem>
              {sorts.map((s) => (
                <DropdownMenuRadioItem key={s.pluginId}
                  value={s.pluginId}>
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}

/** A row's plugin cells as compact toned text (list rows: fixed 58 px height, so no chrome). */
export function PluginCellsText({ cells }: { cells: PluginCell[] | undefined }) {
  if (!cells?.length) return null;
  return (
    <div className="flex max-w-24 shrink-0 flex-col items-end gap-0.5"
      data-plugin-slot="market.column">
      {cells.slice(0, 3).map((c) => (
        <span
          key={c.pluginId}
          title={`${c.title}: ${c.text}`}
          className={cn('max-w-full truncate text-xs font-medium leading-4 tabular-nums', slotToneClass(c.tone))}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}

/** A card's plugin cells as slot badges (card footer). */
export function PluginCellBadges({ cells }: { cells: PluginCell[] | undefined }) {
  if (!cells?.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1"
      data-plugin-slot="market.column">
      {cells.map((c) => (
        <span key={c.pluginId}
          title={c.title}>
          <SlotBadge text={c.text}
            tone={c.tone} />
        </span>
      ))}
    </span>
  );
}

/**
 * `market.rowAction` buttons of the detail pane's actions grid; pending plugins render nothing, failed ones an
 * error chip. Buttons run their command with `args`, defaulting to the row id.
 */
export function PluginRowActions({ row, query }: { row: ScoredListing; query: MarketFilters | null | undefined }) {
  const { listing } = row;
  const { results, retry } = usePluginSlot(
    'market.rowAction',
    () => ({
      row: toMarketRow(row),
      query: query
        ? toMarketQuery(query)
        : {
            ladder: listing.is_ladder,
            hardcore: listing.is_hardcore,
            source: row.status && row.status !== 'active' ? 'archive' : 'live',
          },
    }),
    listing._id,
  );
  return (
    <>
      {results.map((r) =>
        r.state === 'error' ? (
          <span key={r.pluginId}
            className="col-span-2">
            <ErrorChip message={`${r.pluginName}: ${r.error}`}
              onRetry={retry} />
          </span>
        ) : r.state === 'ok' ? (
          r.value.map((button, i) => (
            <SlotAction
              key={`${r.pluginId}:${i}`}
              label={button.label}
              onClick={() => runPluginCommand(r.pluginId, button.commandId, button.args ?? listing._id)}
            />
          ))
        ) : null,
      )}
    </>
  );
}
