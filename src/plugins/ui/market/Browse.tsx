import React, { useState } from 'react';
import { ArrowLeft, PackageSearch, X } from 'lucide-react';
import { CATEGORIES, type Category } from '@pd2-trader/plugin-sdk';
import {
  Badge,
  Button,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Toggle,
  cn,
} from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import {
  LISTING_SORTS,
  type CategoryCount,
  type Collection,
  type DiscoverPage,
  type Listing,
  type ListingSort,
} from '../../marketplace/api';
import { useListings, type Loaded } from './data';
import { ListingCard, type ListingHandlers } from './ListingCard';
import { CardSkeleton, LoadError } from './LoadError';
import { CHIP_BADGE, TONE_BADGE } from './parts';

export interface BrowseFilters {
  category: Category | null;
  tag: string | null;
  /** null = the server default (relevance with a query, popular without). */
  sort: ListingSort | null;
}

export const NO_FILTERS: BrowseFilters = { category: null, tag: null, sort: null };

/** Discover home when nothing is searched or filtered; results otherwise. */
export const isBrowsingHome = (q: string, filters: BrowseFilters) =>
  !q && !filters.category && !filters.tag && !filters.sort;

/** Categories for the chips: the server's list (order, counts) when discover loaded, the fixed taxonomy otherwise. */
function categoryChips(
  discover: Loaded<DiscoverPage>,
): Array<Pick<CategoryCount, 'slug'> & { label?: string; count?: number }> {
  return discover.status === 'ok' && discover.data.categories.length
    ? discover.data.categories
    : CATEGORIES.map((slug) => ({ slug }));
}

function CategoryChips({
  discover,
  value,
  onChange,
}: {
  discover: Loaded<DiscoverPage>;
  value: Category | null;
  onChange: (category: Category | null) => void;
}) {
  const { t } = useTranslation('plugins');
  return (
    <div role="group"
      aria-label={t('marketplace.categoryFilter')}
      className="flex flex-wrap gap-1">
      <Toggle variant="chip"
        pressed={value === null}
        onPressedChange={() => onChange(null)}>
        {t('marketplace.categories.all')}
      </Toggle>
      {categoryChips(discover).map((c) => (
        <Toggle
          key={c.slug}
          variant="chip"
          pressed={value === c.slug}
          onPressedChange={(on) => onChange(on ? c.slug : null)}
        >
          {t(`marketplace.categories.${c.slug}`, { defaultValue: c.label })}
          {c.count !== undefined && <span className="tabular-nums opacity-70">{c.count}</span>}
        </Toggle>
      ))}
    </div>
  );
}

function Grid({ items, handlers }: { items: readonly Listing[]; handlers: ListingHandlers }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((listing) => (
        <ListingCard key={listing.id}
          listing={listing}
          handlers={handlers} />
      ))}
    </div>
  );
}

const SHELF_PREVIEW = 4;

function Shelf({
  title,
  description,
  items,
  handlers,
  onSeeAll,
}: {
  title: string;
  description?: string | null;
  items: readonly Listing[];
  handlers: ListingHandlers;
  onSeeAll?: () => void;
}) {
  const { t } = useTranslation('plugins');
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const more = items.length > SHELF_PREVIEW;
  return (
    <section className="flex flex-col gap-1.5"
      aria-label={title}>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="truncate text-muted-foreground">{description}</p>}
        </div>
        {onSeeAll ? (
          <Button variant="quiet"
            size="inline"
            onClick={onSeeAll}>
            {t('marketplace.discover.seeAll')}
          </Button>
        ) : (
          more && (
            <Button variant="quiet"
              size="inline"
              onClick={() => setExpanded((e) => !e)}>
              {expanded
                ? t('marketplace.discover.showLess')
                : t('marketplace.discover.showAll', { total: items.length })}
            </Button>
          )
        )}
      </div>
      <Grid items={expanded ? items : items.slice(0, SHELF_PREVIEW)}
        handlers={handlers} />
    </section>
  );
}

export function DiscoverHome({
  discover,
  handlers,
  onFilters,
}: {
  discover: Loaded<DiscoverPage>;
  handlers: ListingHandlers;
  onFilters: (filters: BrowseFilters) => void;
}) {
  const { t } = useTranslation('plugins');
  const chips = (
    <CategoryChips discover={discover}
      value={null}
      onChange={(category) => onFilters({ ...NO_FILTERS, category })} />
  );
  if (discover.status === 'error')
    return (
      <>
        {chips}
        <LoadError onRetry={discover.retry} />
      </>
    );
  if (discover.status === 'loading')
    return (
      <>
        {chips}
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  const { collections, trending, updated } = discover.data;
  const empty =
    collections.every((c) => c.items.length === 0) && !trending.length && !discover.data.new.length && !updated.length;
  const seeAll = (sort: ListingSort) => () => onFilters({ ...NO_FILTERS, sort });
  return (
    <>
      {chips}
      {empty ? (
        <EmptyState icon={<PackageSearch />}
          title={t('marketplace.empty')}
          description={t('marketplace.emptyHint')} />
      ) : (
        <>
          {collections.map((c: Collection) => (
            <Shelf key={c.slug}
              title={c.title}
              description={c.description}
              items={c.items}
              handlers={handlers} />
          ))}
          <Shelf
            title={t('marketplace.discover.trending')}
            items={trending}
            handlers={handlers}
            onSeeAll={seeAll('trending')}
          />
          <Shelf
            title={t('marketplace.discover.new')}
            items={discover.data.new}
            handlers={handlers}
            onSeeAll={seeAll('new')}
          />
          <Shelf
            title={t('marketplace.discover.updated')}
            items={updated}
            handlers={handlers}
            onSeeAll={seeAll('updated')}
          />
        </>
      )}
    </>
  );
}

export function SearchResults({
  q,
  filters,
  discover,
  handlers,
  onFilters,
}: {
  q: string;
  filters: BrowseFilters;
  discover: Loaded<DiscoverPage>;
  handlers: ListingHandlers;
  onFilters: (filters: BrowseFilters) => void;
}) {
  const { t } = useTranslation('plugins');
  const listings = useListings({ q, ...filters });
  const sorts = LISTING_SORTS.filter((s) => s !== 'relevance' || q);
  const sort = filters.sort && sorts.includes(filters.sort) ? filters.sort : q ? 'relevance' : 'popular';

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <CategoryChips
          discover={discover}
          value={filters.category}
          onChange={(category) => onFilters({ ...filters, category })}
        />
        <Select value={sort}
          onValueChange={(v) => onFilters({ ...filters, sort: v as ListingSort })}>
          <SelectTrigger aria-label={t('marketplace.sortLabel')}
            className="h-7 w-40 shrink-0 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sorts.map((s) => (
              <SelectItem key={s}
                value={s}
                className="text-xs">
                {t(`marketplace.sort.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        {!q && (
          <Button variant="quiet"
            size="inline"
            onClick={() => onFilters(NO_FILTERS)}>
            <ArrowLeft className="size-3.5" />
            {t('marketplace.discover.back')}
          </Button>
        )}
        {filters.tag && (
          <Badge variant="outline"
            className={cn(TONE_BADGE.muted, CHIP_BADGE)}>
            #{filters.tag}
            <Button
              variant="ghost"
              size="icon-2xs"
              aria-label={t('marketplace.clearTag', { tag: filters.tag })}
              onClick={() => onFilters({ ...filters, tag: null })}
            >
              <X />
            </Button>
          </Badge>
        )}
      </div>

      {listings.status === 'error' ? (
        <LoadError onRetry={listings.retry} />
      ) : listings.status === 'loading' ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : listings.items.length === 0 ? (
        <EmptyState icon={<PackageSearch />}
          title={t('marketplace.empty')}
          description={t('marketplace.emptyHint')} />
      ) : (
        <>
          <Grid items={listings.items}
            handlers={handlers} />
          {listings.more === 'error' && <LoadError onRetry={listings.loadMore} />}
          {listings.nextCursor && listings.more !== 'error' && (
            <Button
              variant="outline"
              size="sm"
              className="self-center"
              disabled={listings.more === 'loading'}
              onClick={listings.loadMore}
            >
              {t('marketplace.loadMore')}
            </Button>
          )}
        </>
      )}
    </>
  );
}
