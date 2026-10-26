import React, { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { RareAppraisalDetail } from '@/components/rares/RareAppraisalDetail';
import { SectionLabel } from '@/components/rares/RareParts';
import { bandRange, fmtBandHr } from '@/components/rares/rares-format';
import { useOptions } from '@/hooks/useOptions';
import { openUrl } from '@/lib/browser-opener';
import { DEFAULT_PRICE_WINDOW_HOURS } from '@/lib/price-window';
import { cn } from '@/lib/utils';
import { shortAgo } from '@/pages/chat/hooks/useTraderProfile';
import { useListingMarketPrices } from '@/pages/chat/hooks/useListingMarketPrices';
import { listingPriceCode } from '@/pages/chat/lib/price-codes';
import { lookupListing } from '@/pages/market/alerts/listing-lookup';
import {
  cheaperListings,
  conditionRequest,
  fetchConditionEstimate,
  fetchLiveListings,
  type ConditionEstimate,
  type LiveListing,
  type LiveListings,
} from './market-context-api';
import { usePriceHistory } from './usePriceHistory';
import { useNow } from './useNow';

/** Cheaper live listings shown. */
const CHEAPER_ROWS = 5;
const SITE_URL = 'https://pd2trader.com';

type Loaded<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

/** A cached request's result as state, keyed by `key` (a new key starts over). */
function useLoaded<T>(key: string | null, load: () => Promise<T>): Loaded<T> {
  const [result, setResult] = useState<{ key: string; loaded: Loaded<T> } | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    load().then(
      (data) => live && setResult({ key, loaded: { status: 'ready', data } }),
      () => live && setResult({ key, loaded: { status: 'error' } }),
    );
    return () => {
      live = false;
    };
    // load is derived from key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return result && result.key === key ? result.loaded : { status: 'loading' };
}

/**
 * Detail-pane Market section: what the item goes for and what else is for sale. Economy items (uniques, sets,
 * runes…): the estimate for this listing's condition, the cheaper live listings (a click opens one here) and a
 * link to the item on pd2trader.com. Rares and crafted: the appraisal (verdict, rank, usual band, stat rolls)
 * and the item's market history.
 */
export function ListingMarket({
  listing,
  onSelectListing,
}: {
  listing: MarketListingEntry;
  onSelectListing: (listing: MarketListingEntry) => void;
}) {
  const code = listing.item ? listingPriceCode(listing.item) : null;
  return code ? (
    <EconomyMarket listing={listing}
      code={code}
      onSelectListing={onSelectListing} />
  ) : (
    <RareMarket listing={listing} />
  );
}

function EconomyMarket({
  listing,
  code,
  onSelectListing,
}: {
  listing: MarketListingEntry;
  code: string;
  onSelectListing: (listing: MarketListingEntry) => void;
}) {
  const { settings } = useOptions();
  const hours = settings.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS;
  const request = conditionRequest(listing, code, hours);
  const estimate = useLoaded(JSON.stringify(request), () => fetchConditionEstimate(request));
  const realm = { isLadder: listing.is_ladder, isHardcore: listing.is_hardcore };
  const live = useLoaded(`${code}|${realm.isLadder}|${realm.isHardcore}`, () => fetchLiveListings(code, realm));
  const trend = useListingMarketPrices([listing]).get(listing._id)?.changePercent;

  return (
    <section aria-label="Market"
      className="space-y-1.5">
      <SectionLabel>Market</SectionLabel>
      <EstimateLine estimate={estimate}
        trend={trend} />
      <CheaperNow listing={listing}
        live={live}
        onSelectListing={onSelectListing} />
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-info hover:underline"
        onClick={() => void openUrl(`${SITE_URL}/item/${encodeURIComponent(code)}`)}
      >
        Open item on pd2trader.com
        <ExternalLink className="size-3" />
      </button>
    </section>
  );
}

const CONFIDENCE_LABELS: Record<ConditionEstimate['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

function EstimateLine({ estimate, trend }: { estimate: Loaded<ConditionEstimate | null>; trend: number | undefined }) {
  if (estimate.status === 'loading') {
    return (
      <div className="flex h-6 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading estimate...
      </div>
    );
  }
  if (estimate.status === 'error' || !estimate.data) {
    return (
      <p className="text-xs text-muted-foreground">
        {estimate.status === 'error' ? 'Estimate unavailable right now' : 'No recent listings to estimate from'}
      </p>
    );
  }
  const e = estimate.data;
  const matched = e.matched.length > 0 ? e.matched.join(', ') : 'any condition';
  return (
    <div aria-label="Estimate"
      className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <div className="flex items-baseline gap-1.5 text-sm">
        <span className="font-semibold tabular-nums">Est. ~{fmtBandHr(e.midHr)} HR</span>
        <span className="text-xs tabular-nums text-muted-foreground">(range {bandRange(e.lowHr, e.highHr)})</span>
        {trend !== undefined && Math.round(trend) !== 0 && (
          <span
            className={cn('ml-auto text-xs tabular-nums', trend > 0 ? 'text-success' : 'text-destructive')}
            title="Item price change over the last 7 days"
          >
            {trend > 0 ? '▲' : '▼'} {Math.abs(Math.round(trend))}% 7d
          </span>
        )}
      </div>
      <div className={cn('text-[11px]', e.confidence === 'low' ? 'text-warning' : 'text-muted-foreground')}>
        {`${CONFIDENCE_LABELS[e.confidence]} · ${e.sampleSize} ${e.basis === 'similar' ? 'near matches' : 'listings'} · ${matched}`}
      </div>
    </div>
  );
}

/** Traits that tell same-item listings apart: "Eth · 3os · +1 skills (corrupted) · ilvl 88". */
function liveTraits(l: LiveListing): string {
  return [
    l.ethereal && 'Eth',
    l.sockets > 0 && `${l.sockets}os`,
    ...l.corruptions,
    l.itemLevel !== null && `ilvl ${l.itemLevel}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

function CheaperNow({
  listing,
  live,
  onSelectListing,
}: {
  listing: MarketListingEntry;
  live: Loaded<LiveListings | null>;
  onSelectListing: (listing: MarketListingEntry) => void;
}) {
  const now = useNow();
  const [opening, setOpening] = useState<string | null>(null);
  if (live.status === 'loading') {
    return (
      <div className="flex h-6 items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Checking live listings...
      </div>
    );
  }
  if (live.status === 'error' || !live.data) {
    return live.status === 'error' ? (
      <p className="text-xs text-muted-foreground">Live listings unavailable right now</p>
    ) : null;
  }

  const asking = listing.hr_price > 0 ? listing.hr_price : null;
  const shown = cheaperListings(listing, live.data.listings);
  const checked = live.data.truncated ? `of newest ${live.data.listings.length} checked` : 'live';

  const open = (l: LiveListing) => {
    if (opening) return;
    setOpening(l.listingId);
    lookupListing(l.listingId)
      .then((detail) => {
        if (detail) onSelectListing(detail.listing);
        else void openUrl(`https://www.projectdiablo2.com/market/listing/${l.listingId}`);
      })
      .catch(() => void openUrl(`https://www.projectdiablo2.com/market/listing/${l.listingId}`))
      .finally(() => setOpening(null));
  };

  return (
    <div
      aria-label={asking === null ? 'Cheapest now' : 'Cheaper now'}
      className="rounded-md border border-border/60 px-2 py-1.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold">{asking === null ? 'Cheapest now' : 'Cheaper now'}</span>
        <span className="text-[10px] text-muted-foreground">{`${shown.length} ${checked}`}</span>
      </div>
      {shown.length === 0 ? (
        <p className="pt-0.5 text-xs text-muted-foreground">
          {asking === null ? 'No priced listings in the same condition' : 'Nothing cheaper in the same condition'}
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-border/60">
          {shown.slice(0, CHEAPER_ROWS).map((l) => {
            const traits = liveTraits(l);
            return (
              <li key={l.listingId}>
                <button
                  type="button"
                  disabled={!!opening}
                  title={l.stats.join('\n')}
                  className="flex w-full items-center gap-2 py-1 text-left text-xs transition-colors hover:bg-accent/60 disabled:opacity-70"
                  onClick={() => open(l)}
                >
                  <span className="w-14 shrink-0 font-semibold tabular-nums text-q-gold">
                    {fmtBandHr(l.priceHr ?? 0)} HR
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {traits || <span className="text-muted-foreground">{l.price}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {shortAgo(Date.parse(l.bumpedAt || l.listedAt), now)}
                  </span>
                  {opening === l.listingId ? (
                    <Loader2 className="size-3 shrink-0 animate-spin" />
                  ) : (
                    <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RareMarket({ listing }: { listing: MarketListingEntry }) {
  const state = usePriceHistory(listing);
  if (state.kind !== 'rare') return null;
  return (
    <section aria-label="Appraisal"
      className="space-y-2">
      <SectionLabel>Appraisal</SectionLabel>
      {state.status === 'loading' ? (
        <div className="flex h-6 items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Appraising...
        </div>
      ) : (
        <RareAppraisalDetail appraisal={state.appraisal}
          history={state.history}
          hardcore={listing.is_hardcore} />
      )}
    </section>
  );
}
