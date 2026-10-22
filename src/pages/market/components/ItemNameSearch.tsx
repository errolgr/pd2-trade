import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptions } from '@/hooks/useOptions';
import { getSeasonDateConfig } from '@/lib/seasons';
import { DEFAULT_PRICE_WINDOW_HOURS, basisLabel, windowLabel } from '@/lib/price-window';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { namePriceCode } from '@/pages/chat/lib/price-codes';
import {
  type ListingMarketPrice,
  type MarketPriceItem,
  useMarketPrices,
} from '@/pages/chat/hooks/useListingMarketPrices';
import { itemNameOptions, type ItemNameOption } from '../lib/catalog';
import { Autocomplete, ClearButton } from './controls';
import { formatHrPrice } from './ResultsList';

const NAME_SUGGESTIONS = 30;
/** Prices are fetched once typing pauses this long (names show at once). */
const PRICE_DEBOUNCE_MS = 150;

const optionKey = (o: ItemNameOption) => `${o.quality}:${o.name}`;

/** Second line, right side: change this week and listings, the fallback window, or why there is no price. */
function PriceDetail({ price, priced }: { price: ListingMarketPrice | null | undefined; priced: boolean }) {
  if (!priced) return null;
  if (price === undefined) return <span className="inline-block h-2 w-14 animate-pulse rounded-full bg-muted" />;
  if (price === null) return <span>no sales</span>;
  const listings = `${price.samples} listing${price.samples === 1 ? '' : 's'}`;
  // Too few recent sales: the server priced it over a longer window (tagged like the price check does)
  if (price.fellBack) return <span className="text-warning">{`${price.window} avg · ${listings}`}</span>;
  const change = price.changePercent;
  if (change === undefined || Math.round(change) === 0) return <span>{`±0% · ${listings}`}</span>;
  return (
    <span className={change > 0 ? 'text-success' : 'text-destructive'}>
      {`${change > 0 ? '+' : '−'}${Math.abs(Math.round(change))}% · ${listings}`}
    </span>
  );
}

/**
 * The market's item-name search (window top bar): suggestions as the site has them, each with its market price
 * in the search's realm, the change this week and how many listings it is based on. The filter applies once a
 * suggestion is picked; clearing the text clears it.
 */
export function ItemNameSearch({
  value,
  onChange,
  ladder,
  hardcore,
  inputRef,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  ladder: boolean;
  hardcore: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [text, setText] = useState(value ?? '');
  // A new value from outside (preset, payload, Clear) replaces the typed text
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setText(value ?? '');
  }
  const options = useMemo(() => itemNameOptions(text, NAME_SUGGESTIONS), [text]);

  const [priceText, setPriceText] = useState(text);
  useEffect(() => {
    const id = window.setTimeout(() => setPriceText(text), PRICE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [text]);
  const priceItems = useMemo(() => {
    const items: MarketPriceItem[] = [];
    for (const o of itemNameOptions(priceText, NAME_SUGGESTIONS)) {
      const code = namePriceCode(o.name, o.quality);
      if (code) items.push({ id: optionKey(o), code, isLadder: ladder, isHardcore: hardcore });
    }
    return items;
  }, [priceText, ladder, hardcore]);
  const prices = useMarketPrices(priceItems);

  const { settings } = useOptions();
  const { endDate } = getSeasonDateConfig(settings.selectedSeasonId);
  const basis = basisLabel(endDate ? 'season' : windowLabel(settings.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS));

  return (
    <div className="relative w-80 cursor-text">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Autocomplete
        ariaLabel="Item name"
        placeholder="Search items…  ( / )"
        inputRef={inputRef}
        value={text}
        onQuery={(q) => {
          setText(q);
          if (!q.trim()) onChange(undefined);
        }}
        options={options}
        optionKey={optionKey}
        onPick={(o) => onChange(o.name)}
        className={cn('h-7 pr-6 pl-7', value && 'text-foreground')}
        contentClassName="w-96"
        renderOption={(o) => {
          const priced = !!namePriceCode(o.name, o.quality);
          const price = prices.get(optionKey(o));
          return (
            <span className="flex flex-col gap-0.5 py-0.5">
              <span className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[13px]',
                    o.quality === 'Runeword' ? 'text-q-rune' : qualityColor(o.quality),
                  )}
                >
                  {o.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {price ? formatHrPrice(price.hr) : price === undefined && priced ? '' : '—'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{o.slot ? `${o.quality} · ${o.slot}` : o.quality}</span>
                <span className="shrink-0 tabular-nums">
                  <PriceDetail price={price}
                    priced={priced} />
                </span>
              </span>
            </span>
          );
        }}
        footer={
          <div className="mt-1 border-t border-border px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
            {`${ladder ? 'Ladder' : 'Non-ladder'} · ${hardcore ? 'Hardcore' : 'Softcore'} · ${basis}`}
          </div>
        }
      />
      {value && <ClearButton label="Clear item name"
        onClick={() => onChange(undefined)} />}
    </div>
  );
}
