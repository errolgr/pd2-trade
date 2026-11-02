import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Filter, MoreHorizontal, RefreshCw, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springSnappy } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EquippedItem, SocketedItem } from '@/lib/builds-api';
import type { BuildsQuery } from '../lib/useBuildsQuery';
import { useBuildsActions } from '../lib/context';
import { type MarketItemRef, marketFiltersFor } from '../lib/market-link';
import { classMeta, classPortraitUrl, fmtHr, initials, qualityBorder, qualityText, skillIconUrl } from '../lib/format';
import { itemArtCandidates } from '../lib/item-art';
import { Trans, useTranslation } from '@/i18n';

/** In-game class portrait (46×41 art); `size` is the height. Unknown classes get a lettered tile. */
export function ClassEmblem({ className, size = 32 }: { className: string; size?: number }) {
  const meta = classMeta(className);
  const [broken, setBroken] = useState(false);
  const width = Math.round((size * 46) / 41);
  if (!meta.known || broken) {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-md border font-semibold"
        style={{ width, height: size, color: meta.color, borderColor: meta.color, fontSize: Math.round(size * 0.5) }}
      >
        {meta.name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={classPortraitUrl(meta.name)}
      width={width}
      height={size}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-[3px] ring-1"
      style={{ width, height: size, ['--tw-ring-color' as string]: `${meta.color}80` }}
    />
  );
}

/** Skill art; a lettered tile when the icon is missing. */
export function SkillIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-border bg-muted/40 text-muted-foreground',
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

export interface IconItem {
  name: string;
  quality: string | null;
  runeword?: boolean;
  iconUrl?: string | null;
  /** Base item name when known (worn items): its art stands in for rares, magic items and runewords. */
  base?: string;
}

/** Item art: the API's icon, else the base's inventory art (see itemArtCandidates); a URL that fails to load moves
 * on to the next; quality-coloured initials when none loads. `height` defaults to `size` (square). */
export function ItemIcon({
  item,
  size = 28,
  height = size,
  className,
}: {
  item: IconItem;
  size?: number;
  height?: number;
  className?: string;
}) {
  const candidates = useMemo(
    () => itemArtCandidates(item),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item.name, item.quality, item.runeword, item.base, item.iconUrl],
  );
  const [failed, setFailed] = useState<string[]>([]);
  const src = candidates.find((url) => !failed.includes(url)) ?? null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border bg-background/50',
        qualityBorder(item.quality, item.runeword),
        className,
      )}
      style={{ width: size, height }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed((f) => [...f, src])}
          className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
        />
      ) : (
        <span
          className={cn('font-semibold', qualityText(item.quality, item.runeword))}
          style={{ fontSize: Math.min(15, Math.round(size * 0.36)) }}
        >
          {initials(item.name) || '?'}
        </span>
      )}
    </span>
  );
}

/** "1.30 HR"; nothing when unpriced (unless `unpriced`). */
export function PriceChip({
  hr,
  unpriced = false,
  className,
}: {
  hr: number | null | undefined;
  unpriced?: boolean;
  className?: string;
}) {
  const { t } = useTranslation('builds');
  if (hr == null) {
    return unpriced ? (
      <span className={cn('text-[11px] text-muted-foreground', className)}
        title={t('price.noReliablePrice')}>
        {t('price.na')}
      </span>
    ) : null;
  }
  return (
    <span
      className={cn('shrink-0 text-[11px] font-medium whitespace-nowrap text-q-gold tabular-nums', className)}
      title={t('price.hrTitle', { hr })}
    >
      {fmtHr(hr)} <span className="text-[10px] opacity-75">HR</span>
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

type TooltipItem = Pick<
  EquippedItem,
  'slot' | 'name' | 'quality' | 'base' | 'runeword' | 'ethereal' | 'corrupted' | 'sockets' | 'mods'
> & { socketed: Pick<SocketedItem, 'name' | 'quality'>[]; priceHr?: number | null };

/** In-game style item card: name in its quality colour, base, mods in magic blue, sockets, price. */
export function ItemTooltipCard({ item }: { item: TooltipItem }) {
  const { t } = useTranslation('builds');
  const nameClass = qualityText(item.quality, item.runeword);
  const flagCorrupted = item.corrupted && !item.mods.some((m) => /^corrupted$/i.test(m));
  return (
    <div className="w-72 rounded-md border border-border bg-background/95 px-3 py-2.5 text-center text-xs leading-[1.45] shadow-panel">
      <div className={cn('text-sm font-semibold', nameClass)}
        style={{ fontFamily: 'DiabloFont' }}>
        {item.name}
      </div>
      {item.base && item.base !== item.name && (
        <div className={cn(item.runeword ? 'text-muted-foreground' : nameClass, 'opacity-90')}>{item.base}</div>
      )}
      <div className="text-[11px] text-muted-foreground">
        {item.slot}
        {item.runeword ? ' · Runeword' : item.quality ? ` · ${item.quality}` : ''}
      </div>
      {item.mods.length > 0 && (
        <ul className="mt-1.5 space-y-px">
          {item.mods.map((mod, i) => (
            <li key={i}
              className={/^corrupted$/i.test(mod) ? 'text-q-corrupted' : 'text-q-magic'}>
              {mod}
            </li>
          ))}
        </ul>
      )}
      {(item.ethereal || item.sockets > 0 || flagCorrupted) && (
        <div className="mt-1 space-y-px">
          {item.ethereal && <div className="text-muted-foreground">Ethereal (Cannot be Repaired)</div>}
          {item.sockets > 0 && <div className="text-muted-foreground">Socketed ({item.sockets})</div>}
          {flagCorrupted && <div className="text-q-corrupted">Corrupted</div>}
        </div>
      )}
      {item.socketed.length > 0 && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-1">
          {item.socketed.map((s, i) => (
            <span
              key={i}
              className={cn('rounded-sm border border-border/70 px-1.5 py-px text-[11px]', qualityText(s.quality))}
            >
              {s.name}
            </span>
          ))}
        </div>
      )}
      {item.priceHr !== undefined && (
        <div className="mt-2 border-t border-border/60 pt-1.5 text-[11px]">
          {item.priceHr != null ? (
            <span className="text-muted-foreground">
              <Trans
                t={t}
                i18nKey="price.marketValue"
                values={{ value: fmtHr(item.priceHr) }}
                components={{ num: <span className="font-semibold text-q-gold tabular-nums" /> }}
              />
            </span>
          ) : (
            <span className="text-muted-foreground">{t('price.noReliablePrice')}</span>
          )}
        </div>
      )}
    </div>
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
        label ? 'h-6 gap-1 px-2 text-[11px]' : 'size-6 p-0',
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
          <button
            type="button"
            aria-label={t('itemActions.actionsFor', { name: item.name })}
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
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
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative inline-flex items-center justify-center rounded-[4px] px-2 text-xs text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
            value === o.value && 'text-accent-foreground',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={layoutId}
              transition={springSnappy}
              aria-hidden
              className="absolute inset-0 rounded-[4px] bg-accent shadow-xs"
            />
          )}
          <span className="relative flex items-center gap-1">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
