import React, { useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { ArrowRight, Ban, ChevronRight, HandCoins, Loader2, LogIn, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tip } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { showToast } from '@/overlay';
import { trackEvent } from '@/lib/telemetry';
import { useTranslation } from '@/i18n';
import { useNow } from '@/pages/market/enrich/useNow';
import { useMarketStore } from '@/pages/market/store/useMarketStore';
import { toggleWatch, watchState } from '../alerts/WatchButton';
import { MarketApiError } from '../alerts/market-api';
import { createWtbRequest, updateWtbRequest, WtbImpossibleError } from '../alerts/wtb-api';
import { NumberInput, Segmented, SelectMenu } from '../components/controls';
import { withSource, type SearchDefaults } from '../lib/defaults';
import { roundHr } from '../lib/price-stats';
import { groupOf } from '../lib/stat-groups';
import type { MarketApi, MarketFilters, StatFilter } from '../lib/types';
import {
  DEFAULT_WTB_EXPIRY_DAYS,
  formatOffer,
  impossibleByRow,
  isValidOfferAmount,
  MAX_OPEN_WTB_PER_USER,
  niceToHaveIdsFor,
  toggleNiceToHave,
  WTB_CURRENCY_OPTIONS,
  WTB_EXPIRY_DAYS,
  isPostBlocker,
  postBlocker,
  type WtbImpossible,
  type WtbPostBlocker,
  wtbCheckBody,
  wtbStatRows,
  type WtbCurrency,
  type WtbExpiryDays,
  type WtbRequest,
} from '../lib/wtb';
import { statRowText, wtbTitle, wtbTitleColor } from './wtb-text';
import { filterName } from '../components/stat-text';
import { WtbItemArt } from './WtbItemArt';
import { useWtbCheck, useWtbOverlap, type MyWtbRequests } from './useWtbData';
import { OTHERS_ROWS, othersBoxModel, othersOverlapBody } from './wtb-demand';

/** The drawer follows the filters as they're edited: ask once they settle. */
const OTHERS_DEBOUNCE_MS = 400;

/** Waits this long after the last filter change before asking for the sold prices. */
const SOLD_LATELY_DEBOUNCE_MS = 400;

/** What the user is told a blocked request lacks (WTB_POST_RULE v2). */
const BLOCKER_KEYS: Record<WtbPostBlocker, string> = {
  item: 'wtb.post.blocked.item',
  detail: 'wtb.post.blocked.detail',
};

/**
 * Why a request can't exist, one short line: "Shael Rune can't have stats", "Life can't roll on Ring", "Harlequin
 * Crest has at most +3 All Skills", "Harlequin Crest takes at most 2 sockets". `rows`: the filters' stat rows.
 */
function impossibleText(t: TFunction, entry: WtbImpossible, rows: readonly StatFilter[]): string {
  const { item, max } = entry;
  const row: StatFilter | undefined =
    rows.find((r) => r.id === entry.rowId) ??
    (entry.key ? { id: '', kind: 'mod', key: entry.key, enabled: true } : undefined);
  switch (entry.reason) {
    case 'sockets':
      if (max === undefined) return t('wtb.post.impossible.tooManySockets', { item });
      return max === 0
        ? t('wtb.post.impossible.noSockets', { item })
        : t('wtb.post.impossible.sockets', { item, count: max });
    case 'above-max':
      if (row && max !== undefined)
        return t('wtb.post.impossible.aboveMax', {
          item,
          stat: statRowText({ ...row, min: max, max: undefined, not: false }),
        });
      if (row) return t('wtb.post.impossible.tooHigh', { item, stat: filterName(row) });
      return t('wtb.post.impossible.noStats', { item });
    case 'cannot-roll':
      if (row) return t('wtb.post.impossible.cannotRoll', { item, stat: filterName(row) });
      return t('wtb.post.impossible.noStats', { item });
    case 'no-stats':
      return t('wtb.post.impossible.noStats', { item });
  }
}

/**
 * "Sold lately · low – high HR": the p25–p75 HR price of the same search over the sold archive (the existing market
 * search, `source: 'archive'`), optional rows left out; null when nothing sold or the search fails.
 */
function useSoldLately(
  api: MarketApi | null,
  filters: MarketFilters,
  niceToHaveIds: readonly string[],
  defaults: SearchDefaults,
): { low: number; high: number } | null {
  const [range, setRange] = useState<{ low: number; high: number } | null>(null);
  useEffect(() => {
    if (!api) return;
    const controller = new AbortController();
    const archive: MarketFilters = {
      ...withSource(filters, 'archive', defaults),
      stats: filters.stats.filter((s) => !niceToHaveIds.includes(s.id)),
      // A buyer's search: who sold it and how it was priced don't narrow what it sells for
      userOnlineSite: 'all',
      userOnlineGame: 'all',
      hasBuyout: 'any',
      sellerUserId: undefined,
      sellerName: undefined,
      priceText: undefined,
      hrMin: undefined,
      hrMax: undefined,
      hrMaxExclusive: undefined,
    };
    const timer = window.setTimeout(() => {
      api.searchListings(archive, { page: 0, limit: 1, signal: controller.signal, priceStats: true }).then(
        ({ priceStats }) =>
          setRange(
            priceStats && priceStats.count > 0 && priceStats.p25 !== null && priceStats.p75 !== null
              ? { low: roundHr(priceStats.p25), high: roundHr(priceStats.p75) }
              : null,
          ),
        (error) => {
          if (controller.signal.aborted) return;
          console.warn('[wtb] sold lately search failed:', error);
          setRange(null);
        },
      );
    }, SOLD_LATELY_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [api, filters, niceToHaveIds, defaults]);
  return range;
}

export interface WtbPostDrawerProps {
  /** The Search tab's filters: the request is live-bound to them. */
  filters: MarketFilters;
  /** Mine → Edit: the request being edited (its filters are already loaded into Search). */
  editing: WtbRequest | null;
  token: string | null;
  /** The signed-in user: their own requests don't count as others'. */
  userId: string | null;
  /** The account sellers whisper (`/w *account`). */
  whisperTo: string | null;
  onSignIn: () => void;
  mine: MyWtbRequests;
  api: MarketApi | null;
  searchDefaults: SearchDefaults;
  /** A new request's unsaved choices from the last time the pane was open (null: none). */
  draft: WtbPostDraft | null;
  /** A new request's choices as they change; null once posted. */
  onDraftChange: (draft: WtbPostDraft | null) => void;
  /** "Others want this too": a row opens that request on the Wanted source. */
  onOpenRequest: (request: WtbRequest) => void;
  /** "See all": the Wanted source for these filters. */
  onSeeAllRequests: () => void;
  onClose: () => void;
}

/** A new request's choices besides the filters (kept while the pane is closed, see `draft`). */
export interface WtbPostDraft {
  niceIds: string[];
  amount: number | undefined;
  currency: WtbCurrency;
  openToOffers: boolean;
  expiry: string;
  alsoWatch: boolean;
}

/** Right pane of the Search tab: post (or edit) a buy request for the filters on the left. */
export function WtbPostDrawer({
  filters,
  editing,
  token,
  userId,
  whisperTo,
  onSignIn,
  mine,
  api,
  searchDefaults,
  draft,
  onDraftChange,
  onOpenRequest,
  onSeeAllRequests,
  onClose,
}: WtbPostDrawerProps) {
  const { t } = useTranslation(['market', 'common']);
  const store = useMarketStore();
  const [niceIds, setNiceIds] = useState<string[]>(() => editing?.niceToHaveIds ?? draft?.niceIds ?? []);
  const [amount, setAmount] = useState<number | undefined>(editing ? editing.offer.amount : draft?.amount);
  const [currency, setCurrency] = useState<WtbCurrency>(editing?.offer.currency ?? draft?.currency ?? 'HR');
  const [openToOffers, setOpenToOffers] = useState(editing?.openToOffers ?? draft?.openToOffers ?? true);
  /** How long the request runs (new) / each bump runs it for (editing: doesn't move its expiry). */
  const [expiry, setExpiry] = useState<string>(String(editing?.expiryDays ?? draft?.expiry ?? DEFAULT_WTB_EXPIRY_DAYS));
  const [alsoWatch, setAlsoWatch] = useState(editing ? false : (draft?.alsoWatch ?? true));
  const [saving, setSaving] = useState(false);
  const now = useNow();

  // Stable while the filters and picks are: the sold prices search reruns only on a real change
  const niceToHaveIds = useMemo(() => niceToHaveIdsFor(filters, niceIds), [filters, niceIds]);
  const rows = wtbStatRows(filters);
  const title = wtbTitle(filters, niceToHaveIds);
  const soldLately = useSoldLately(api, filters, niceToHaveIds, searchDefaults);
  // "Also Watch" watches these filters' live listings (also when posting from the Wanted source)
  const watchFilters = useMemo(() => withSource(filters, 'live', searchDefaults), [filters, searchDefaults]);
  const { watching } = watchState(store, watchFilters);
  const validAmount = isValidOfferAmount(amount);
  const blocker = postBlocker(filters, niceToHaveIds);
  // Others asking for what this request would take (never the user's own, so not the one being edited): read as
  // soon as the filters name an item, also before the request can be posted
  const overlapBody = useMemo(() => othersOverlapBody(filters), [filters]);
  const others = othersBoxModel(useWtbOverlap(overlapBody, token, OTHERS_DEBOUNCE_MS), filters, {
    userId,
    editingId: editing?.id ?? null,
    now,
  });
  // What of the request can't exist: the server's check as the filters settle, or its 400 on the last post of
  // these same filters
  const checkBody = useMemo(() => wtbCheckBody(filters, niceToHaveIds), [filters, niceToHaveIds]);
  const checked = useWtbCheck(checkBody, token, OTHERS_DEBOUNCE_MS);
  const [rejected, setRejected] = useState<{
    filters: MarketFilters;
    niceToHaveIds: string[];
    impossible: WtbImpossible[];
  } | null>(null);
  const impossible =
    rejected && rejected.filters === filters && rejected.niceToHaveIds === niceToHaveIds
      ? rejected.impossible
      : checked;
  const impossibleRows = impossibleByRow(impossible, rows);
  const impossibleLines = [...new Set(impossible.map((entry) => impossibleText(t, entry, filters.stats)))];
  // A new request's unsaved choices outlive the pane (closing it, opening another request), until it is posted
  useEffect(() => {
    if (!editing) onDraftChange({ niceIds, amount, currency, openToOffers, expiry, alsoWatch });
  }, [editing, onDraftChange, niceIds, amount, currency, openToOffers, expiry, alsoWatch]);

  const expiryOptions = WTB_EXPIRY_DAYS.map((d) => ({ value: String(d), label: t('wtb.post.days', { count: d }) }));

  const submit = async () => {
    if (!token || !whisperTo || !validAmount || blocker || impossible.length > 0 || saving) return;
    setSaving(true);
    const offer = { amount, currency };
    try {
      const saved = editing
        ? await updateWtbRequest(token, editing.id, {
            title,
            whisperTo,
            filters,
            niceToHaveIds,
            offer,
            openToOffers,
            expiryDays: Number(expiry) as WtbExpiryDays,
          })
        : await createWtbRequest(token, {
            title,
            whisperTo,
            filters,
            niceToHaveIds,
            offer,
            openToOffers,
            expiresInDays: Number(expiry) as WtbExpiryDays,
          });
      mine.upsert(saved);
      trackEvent(editing ? 'wtb_request_edited' : 'wtb_request_posted', { currency, watch: alsoWatch && !watching });
      showToast({
        title: editing ? t('wtb.post.savedToast') : t('wtb.post.postedToast'),
        description: `${saved.title} · ${formatOffer(saved.offer)}`,
        variant: 'success',
      });
      if (alsoWatch && !watching) toggleWatch(store, watchFilters);
      if (!editing) onDraftChange(null);
      onClose();
    } catch (error) {
      const status = error instanceof MarketApiError ? error.status : 0;
      const rule = error instanceof MarketApiError ? error.rule : null;
      if (status === 401) {
        showToast({ title: t('wtb.post.signInAgain'), variant: 'warning' });
        onSignIn();
      } else if (status === 409) {
        showToast({
          title: t('wtb.post.capTitle'),
          description: t('wtb.post.capDescription', { count: MAX_OPEN_WTB_PER_USER }),
          variant: 'warning',
        });
      } else if (error instanceof WtbImpossibleError) {
        setRejected({ filters, niceToHaveIds, impossible: error.impossible });
        showToast({
          title: editing ? t('wtb.post.saveFailed') : t('wtb.post.postFailed'),
          description: [...new Set(error.impossible.map((entry) => impossibleText(t, entry, filters.stats)))].join(
            ' · ',
          ),
          variant: 'warning',
        });
      } else if (status === 400 && isPostBlocker(rule)) {
        showToast({
          title: editing ? t('wtb.post.saveFailed') : t('wtb.post.postFailed'),
          description: t(BLOCKER_KEYS[rule]),
          variant: 'warning',
        });
      } else {
        showToast({
          title: editing ? t('wtb.post.saveFailed') : t('wtb.post.postFailed'),
          description: error instanceof Error ? error.message : String(error),
          variant: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const heading = editing ? t('wtb.post.editTitle') : t('wtb.post.title');
  return (
    <aside aria-label={heading}
      className="flex h-full min-h-0 flex-col border-l border-border bg-card/40">
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <HandCoins className="size-3.5 text-primary" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{heading}</span>
        <Button variant="ghost"
          size="sm"
          className="size-7 p-0"
          aria-label={t('detail.close')}
          onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-3 p-2.5">
          <p className="text-[11px] text-muted-foreground">{t('wtb.post.filtersHint')}</p>

          <section
            aria-label={t('wtb.post.summary')}
            className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-2"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <WtbItemArt filters={filters}
                className="size-12"
                artClassName="max-h-11 max-w-11" />
              <div className="flex min-w-0 items-baseline gap-2">
                <span className={cn('min-w-0 truncate text-sm font-semibold', wtbTitleColor(filters))}>{title}</span>
                {filters.corrupted === 'yes' && (
                  <span className="shrink-0 rounded-sm border border-q-corrupted/50 bg-q-corrupted/10 px-1 text-[10px] font-semibold text-q-corrupted">
                    {t('wtb.corrupted')}
                  </span>
                )}
              </div>
            </div>
            {rows.length > 0 && (
              <ul className="space-y-0.5">
                {rows.map((row) => {
                  const group = groupOf(row);
                  const nice = niceToHaveIds.includes(row.id);
                  const why = impossibleRows.get(row.id);
                  const whyText = why && impossibleText(t, why, filters.stats);
                  return (
                    <li key={row.id}
                      className="flex min-w-0 items-center gap-1.5 text-xs">
                      <Tip label={whyText}>
                        <span
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-1',
                            why ? 'text-destructive' : row.kind === 'corruption' ? 'text-q-corrupted' : 'text-q-magic',
                            nice && !why && 'opacity-70',
                          )}
                        >
                          {why && <Ban aria-label={whyText}
                            className="size-3 shrink-0" />}
                          <span className="min-w-0 truncate">{statRowText(row)}</span>
                        </span>
                      </Tip>
                      {group === 'and' ? (
                        <button
                          type="button"
                          aria-pressed={nice}
                          aria-label={t('wtb.post.toggleNice', { stat: statRowText(row) })}
                          onClick={() => setNiceIds(toggleNiceToHave(niceToHaveIds, row.id))}
                          className={cn(
                            'h-5 shrink-0 rounded-full border px-2 text-[10px] font-semibold outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
                            nice
                              ? 'border-muted-foreground/50 bg-transparent text-muted-foreground hover:text-foreground'
                              : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15',
                          )}
                        >
                          {nice ? t('wtb.nice') : t('wtb.must')}
                        </button>
                      ) : (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {group === 'not' ? t('wtb.post.excluded') : t('wtb.post.anyOf')}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {rows.some((r) => groupOf(r) === 'and') && (
              <p className="text-[10px] text-muted-foreground">{t('wtb.post.niceHint')}</p>
            )}
          </section>

          <section className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="wtb-offer"
                className="text-xs font-medium">
                {t('wtb.post.yourOffer')}
              </label>
              {soldLately && (
                <span className="truncate text-[11px] text-muted-foreground tabular-nums">
                  {t('wtb.post.soldLately', { low: soldLately.low, high: soldLately.high })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div id="wtb-offer"
                className="min-w-0 flex-1">
                <NumberInput
                  ariaLabel={t('wtb.post.amount')}
                  placeholder={t('wtb.post.amount')}
                  value={amount}
                  min={0}
                  step={0.5}
                  onChange={setAmount}
                />
              </div>
              <SelectMenu
                label={t('wtb.post.currency')}
                value={currency}
                options={WTB_CURRENCY_OPTIONS}
                anyLabel={null}
                onChange={(v) => v && setCurrency(v as WtbCurrency)}
                className="w-24 shrink-0"
              />
            </div>
            {amount !== undefined && !validAmount && (
              <p className="text-[11px] text-destructive">{t('wtb.post.invalidAmount')}</p>
            )}
            {others && (
              <section
                aria-label={t('wtb.others.title')}
                className="overflow-hidden rounded-md border border-border/60 bg-muted/30"
              >
                <div className="flex items-center gap-2 px-2 pt-1.5 pb-1">
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('wtb.others.titleCount', { count: others.count })}
                  </span>
                  {others.count > OTHERS_ROWS && (
                    <button
                      type="button"
                      onClick={onSeeAllRequests}
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-sm text-[11px] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {t('wtb.others.seeAll', { count: others.count })}
                      <ArrowRight className="size-3" />
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-border/50 border-t border-border/50">
                  {others.rows.map((row) => (
                    <li key={row.request.id}>
                      <button
                        type="button"
                        onClick={() => onOpenRequest(row.request)}
                        aria-label={t('wtb.others.open', { name: row.buyer, offer: row.offer })}
                        className="flex min-h-10 w-full items-center gap-2 px-2 py-1.5 text-left outline-none transition-colors duration-(--dur-med) hover:bg-accent/30 focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
                      >
                        <WtbItemArt
                          filters={row.request.filters}
                          className="size-6 shrink-0"
                          artClassName="max-h-5 max-w-5"
                        />
                        <span className="min-w-0 flex-1 text-[11px] leading-4">
                          <span className="flex min-w-0 items-baseline gap-1.5">
                            <span className="truncate font-semibold">{row.buyer}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">{row.age}</span>
                          </span>
                          {/* How it differs, one line: the text truncates, "+N more" stays whole after it */}
                          <span className="flex min-w-0 text-muted-foreground">
                            <span className="truncate">
                              {row.difference.kind === 'same' ? t('wtb.others.sameStats') : row.difference.text}
                            </span>
                            {row.difference.kind === 'row' && row.difference.more > 0 && (
                              <span className="shrink-0 whitespace-nowrap pl-1">
                                {t('wtb.others.more', { count: row.difference.more })}
                              </span>
                            )}
                          </span>
                        </span>
                        {/* What they pay and the way in, centred in the row */}
                        <span className="flex shrink-0 items-center gap-1">
                          <span className="text-xs font-semibold tabular-nums text-q-gold">{row.offer}</span>
                          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={openToOffers}
              onCheckedChange={(v) => setOpenToOffers(v === true)} />
            {t('wtb.post.openToOffers')}
          </label>

          <div className="space-y-1">
            <div className="text-xs font-medium">{editing ? t('wtb.post.expiryNext') : t('wtb.post.expires')}</div>
            <Segmented
              label={editing ? t('wtb.post.expiryNext') : t('wtb.post.expires')}
              value={expiry}
              options={expiryOptions}
              onChange={setExpiry}
            />
          </div>

          <label
            className={cn('flex items-center gap-2 text-xs', watching ? 'text-muted-foreground' : 'cursor-pointer')}
          >
            <Checkbox
              checked={alsoWatch || !!watching}
              disabled={!!watching}
              onCheckedChange={(v) => setAlsoWatch(v === true)}
            />
            {watching ? t('wtb.post.alreadyWatching') : t('wtb.post.alsoWatch')}
          </label>

          <section
            aria-label={t('wtb.post.preview')}
            className="space-y-0.5 rounded-md border border-dashed border-success/60 bg-success/5 p-2"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('wtb.post.preview')}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-success">
              <HandCoins className="size-3.5 shrink-0" />
              {validAmount
                ? t('wtb.post.previewLine', { offer: formatOffer({ amount, currency }) })
                : t('wtb.post.previewLineNoOffer')}
            </div>
            <div className="text-[11px] text-muted-foreground">{t('wtb.post.previewHint')}</div>
          </section>
        </div>
      </ScrollArea>

      <div className="space-y-1.5 border-t border-border p-2.5">
        {impossibleLines.map((line) => (
          <p key={line}
            role="status"
            className="text-[11px] text-destructive">
            {line}
          </p>
        ))}
        {blocker && (
          <p role="status"
            className="text-[11px] text-warning">
            {t(BLOCKER_KEYS[blocker])}
          </p>
        )}
        {token ? (
          <Button
            className="h-8 w-full text-xs"
            disabled={!validAmount || !!blocker || impossible.length > 0 || !whisperTo || saving}
            onClick={() => void submit()}
          >
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            {editing ? t('wtb.post.save') : t('wtb.post.submit')}
          </Button>
        ) : (
          <Button className="h-8 w-full text-xs"
            onClick={onSignIn}>
            <LogIn className="size-3.5" />
            {t('wtb.post.signIn')}
          </Button>
        )}
      </div>
    </aside>
  );
}
