import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Filter, MoreHorizontal, RefreshCw, Store } from 'lucide-react';
import {
  cn,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ItemTooltip,
  springSnappy,
} from '@pd2-trader/ui';
import type { EquippedItem, SocketedItem } from '@/lib/builds-api';
import type { BuildsQuery } from '../lib/useBuildsQuery';
import { useBuildsActions } from '../lib/context';
import { type MarketItemRef, marketFiltersFor } from '../lib/market-link';
import { fmtHr, initials, skillIconUrl } from '../lib/format';
import { Trans, useTranslation } from '@/i18n';

/** Skill art; a lettered tile when the icon is missing. */
export function SkillIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted/40 text-muted-foreground',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {broken === name ? (
        <span className="font-semibold"
          style={{ fontSize: Math.round(size * 0.4) }}>
          {initials(name)}
        </span>
      ) : (
        <img
          src={skillIconUrl(name)}
          width={size}
          height={size}
          alt=""
          loading="lazy"
          onError={() => setBroken(name)}
        />
      )}
    </span>
  );
}

/** Share bar (0–100). */
export function ShareBar({ pct, className, barClassName }: { pct: number; className?: string; barClassName?: string }) {
  return (
    <span className={cn('block h-1 overflow-hidden rounded-full bg-muted/60', className)}
      aria-hidden>
      <motion.span
        className={cn('block h-full rounded-full bg-primary/70', barClassName)}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        transition={springSnappy}
      />
    </span>
  );
}

type WornItem = Pick<
  EquippedItem,
  'slot' | 'name' | 'quality' | 'base' | 'runeword' | 'ethereal' | 'corrupted' | 'sockets' | 'mods'
> & { socketed: Pick<SocketedItem, 'name' | 'quality'>[]; priceHr?: number | null };

/** A worn item's ItemTooltip: its PD2 display lines as mods; slot and market value in the footer. */
export function WornItemTooltip({ item }: { item: WornItem }) {
  const { t } = useTranslation('builds');
  return (
    <ItemTooltip
      item={{
        name: item.name,
        base: item.base,
        quality: item.quality ?? 'Rune',
        runeword: item.runeword,
        mods: item.mods.map((text) => ({ text })),
        sockets: item.sockets,
        socketed: item.socketed,
        ethereal: item.ethereal,
        corrupted: item.corrupted || item.mods.some((m) => /^corrupted$/i.test(m)),
      }}
      footer={
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span>
            {item.slot}
            {item.runeword ? ' · Runeword' : item.quality ? ` · ${item.quality}` : ''}
          </span>
          {item.priceHr !== undefined &&
            (item.priceHr != null ? (
              <span>
                <Trans
                  t={t}
                  i18nKey="price.marketValue"
                  values={{ value: fmtHr(item.priceHr) }}
                  components={{ num: <span className="font-semibold text-q-gold tabular-nums" /> }}
                />
              </span>
            ) : (
              <span>{t('price.noReliablePrice')}</span>
            ))}
        </div>
      }
    />
  );
}

/** Market search button for one item (icon-only unless `label`). */
export function SearchMarketButton({
  item,
  label = false,
  className,
}: {
  item: MarketItemRef;
  label?: boolean;
  className?: string;
}) {
  const { t } = useTranslation('builds');
  const { searchMarket, mode } = useBuildsActions();
  if (!marketFiltersFor(item, mode)) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={t('itemActions.searchMarketFor', { name: item.name })}
      title={t('itemActions.searchMarketFor', { name: item.name })}
      onClick={(e) => {
        e.stopPropagation();
        searchMarket(item);
      }}
      className={cn(
        label ? 'h-6 gap-1 px-2 text-2xs' : 'size-6 p-0',
        'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      <Store className="size-3.5" />
      {label && t('itemActions.searchMarket')}
    </Button>
  );
}

/** "…" menu of an item: Search market, Filter Meta by this item. */
export function ItemActionsMenu({
  item,
  merc = false,
  children,
}: {
  item: MarketItemRef;
  merc?: boolean;
  /** The trigger (a button); default a small "…" button. */
  children?: React.ReactElement;
}) {
  const { t } = useTranslation('builds');
  const { searchMarket, filterMetaByItem, mode } = useBuildsActions();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('itemActions.actionsFor', { name: item.name })}
            className="text-muted-foreground focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start"
        className="min-w-48">
        <DropdownMenuItem disabled={!marketFiltersFor(item, mode)}
          onSelect={() => searchMarket(item)}>
          <Store /> {t('itemActions.searchMarket')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => filterMetaByItem({ key: item.key, name: item.name }, merc)}>
          <Filter /> {t('itemActions.filterMeta')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A failed request: what went wrong and Retry (429: wait a moment). */
export function QueryError({
  query,
  title,
  className,
  compact = false,
}: {
  query: Pick<BuildsQuery<unknown>, 'error' | 'status' | 'retry' | 'loading'>;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation(['builds', 'common']);
  const message =
    query.status === 429 ? t('error.tooManyRequests') : query.status === 0 ? t('error.unreachable') : query.error;
  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-destructive/35 bg-destructive/10 text-sm',
        compact ? 'px-2.5 py-2' : 'px-3 py-3',
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{title ?? t('error.loadBuilds')}</p>
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
      </div>
      <Button size="sm"
        variant="outline"
        className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
        onClick={query.retry}>
        <RefreshCw className={cn('size-3.5', query.loading && 'animate-spin')} />
        {t('common:actions.retry')}
      </Button>
    </div>
  );
}

/** Edge-to-edge section of a column: hairline-ruled header, flush body (stack them with `divide-y`). */
export function Section({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('flex flex-col', className)}>
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-border/50 px-3">
        {icon && <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>}
        <h3 className="min-w-0 flex-1 truncate text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </header>
      <div className={cn('px-1.5 py-1', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small segmented control (radio group) with a sliding highlight. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  layoutId,
  className,
}: {
  value: T;
  options: { value: NoInfer<T>; label: React.ReactNode; title?: string }[];
  onChange: (value: NoInfer<T>) => void;
  label: string;
  /** Unique per control (framer layout animation). */
  layoutId: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex h-7 shrink-0 rounded-md border border-input bg-background/40 p-0.5', className)}
    >
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          variant="quiet"
          size="inline"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative rounded-sm px-2 text-xs font-normal focus-visible:ring-ring/50',
            value === o.value && 'text-accent-foreground',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId}
              transition={springSnappy}
              aria-hidden
              className="absolute inset-0 rounded-sm bg-accent shadow-xs"
            />
          )}
          <span className="relative flex items-center gap-1">{o.label}</span>
        </Button>
      ))}
    </div>
  );
}
