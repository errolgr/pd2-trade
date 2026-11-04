import { Button, cn } from '@pd2-trader/ui';
import { currentLocale, useTranslation } from '@/i18n';
import {
  bucketLight,
  bucketMarkers,
  inRange,
  priceFilter,
  priceRange,
  type HrRange,
  type PriceBucket,
} from '../lib/facets';
import { useRangePicker } from '../hooks/useRangePicker';
import { ClearButton, BoundInput } from './controls';
import { FACET_DIM, FacetTip, useFacetText } from './FacetCounts';

const hrText = (n: number) => n.toLocaleString(currentLocale(), { maximumFractionDigits: 2 });
const pct = (fraction: number) => `${fraction * 100}%`;

/** The min / max inputs inside the control's frame. */
const bareInput =
  'h-7 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent';

/**
 * The HR price range: one frame with the listings per price bucket on top (with facets), a hairline, then min | max.
 *
 * Bars are one width per bucket (not to scale) and picked like dates on a calendar (see useRangePicker): a bucket is
 * `[from, to)` (max exclusive), a second one the range between their outer edges, the open last one no max. Typed
 * bounds light the bars they cover, part of a bar (and a marker line) when a bound falls inside a bucket; a typed max
 * is inclusive.
 */
export function PriceControl({
  label,
  buckets,
  value,
  onChange,
}: {
  label: string;
  /** The price facet; without one (or with no listings in it) only the inputs show. */
  buckets: PriceBucket[] | undefined;
  value: HrRange;
  /** Always every field of the range. */
  onChange: (next: HrRange) => void;
}) {
  const { t } = useTranslation('market');
  const facetText = useFacetText();
  const bars = buckets?.some((b) => b.count > 0) ? buckets : undefined;
  const { preview, groupProps, optionProps } = useRangePicker({
    count: bars?.length ?? 0,
    selected: bars ? priceRange(bars, value) : null,
    onPick: (r) => bars && onChange(priceFilter(bars, r)),
  });
  const { hrMin, hrMax } = value;
  const set = hrMin !== undefined || hrMax !== undefined;
  const rangeText = (from: number | undefined, to: number | undefined) =>
    from === undefined
      ? t('facets.priceUpTo', { to: hrText(to!) })
      : to === undefined
        ? t('facets.priceOpen', { from: hrText(from) })
        : t('facets.price', { from: hrText(from), to: hrText(to) });
  const peak = Math.max(1, ...(bars ?? []).map((b) => b.count));

  return (
    <div className="overflow-hidden rounded-md border border-input transition-colors duration-(--dur-fast) focus-within:border-primary">
      {bars && (
        <div
          role="group"
          aria-label={t('facets.priceBars', { selection: set ? rangeText(hrMin, hrMax) : t('facets.priceAny') })}
          {...groupProps}
          // No padding: hover, preview and selection tints run from the top border down to the divider
          className="relative grid h-7.5 px-1 select-none"
          style={{ ...groupProps.style, gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
        >
          {bars.map((b, i) => {
            const light = bucketLight(b, value);
            const text = facetText(rangeText(b.from, b.to ?? undefined), b.count);
            return (
              <FacetTip key={b.from}
                text={text}>
                <Button
                  type="button"
                  variant="ghost"
                  size="inline"
                  aria-label={text}
                  aria-pressed={!!light}
                  {...optionProps(i)}
                  className="group relative flex h-full min-w-0 items-end gap-0 rounded-none px-px font-normal hover:bg-primary/6 hover:text-current focus-visible:bg-primary/15 focus-visible:ring-0 motion-safe:active:scale-100"
                >
                  {inRange(preview, i) && <span aria-hidden
                    className="absolute inset-0 bg-primary/6" />}
                  {light && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0 bg-primary/12"
                      style={{ left: pct(light.from), width: pct(light.to - light.from) }}
                    />
                  )}
                  <span
                    aria-hidden
                    data-bar
                    // Square root: one busy bucket shouldn't flatten the rest. Capped at 82% so the tallest bar
                    // keeps headroom under the top border while the tints behind it still fill the full height.
                    style={{ height: b.count ? `${Math.max(8, Math.sqrt(b.count / peak) * 82)}%` : 2 }}
                    className={cn(
                      'relative block w-full overflow-hidden rounded-t-xs bg-muted-foreground/35 transition-colors duration-(--dur-fast) group-hover:bg-muted-foreground/60',
                      b.count === 0 && FACET_DIM,
                    )}
                  >
                    {light && (
                      <span
                        data-bar-light
                        className="absolute inset-y-0 bg-primary"
                        style={{ left: pct(light.from), width: pct(light.to - light.from) }}
                      />
                    )}
                  </span>
                  {bucketMarkers(b, value).map((m) => (
                    <span
                      key={m}
                      aria-hidden
                      data-bar-marker
                      className="absolute inset-y-0 w-px bg-primary"
                      style={{ left: `calc(1px + (100% - 2px) * ${m})` }}
                    />
                  ))}
                </Button>
              </FacetTip>
            );
          })}
          {/* The divider, over the bars' bottom edge so they stand on it */}
          <span aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-px bg-input" />
        </div>
      )}
      <div className="relative flex items-center">
        <BoundInput
          ariaLabel={t('controls.minLabel', { label })}
          placeholder={t('controls.min')}
          value={hrMin}
          step={0.1}
          onChange={(v) => onChange({ ...value, hrMin: v })}
          className={bareInput}
        />
        <span aria-hidden
          className="h-3 w-px shrink-0 bg-input" />
        <BoundInput
          ariaLabel={t('controls.maxLabel', { label })}
          placeholder={t('controls.max')}
          value={hrMax}
          step={0.1}
          // A typed max is inclusive
          onChange={(v) => onChange({ ...value, hrMax: v, hrMaxExclusive: undefined })}
          className={cn(bareInput, set && 'pr-7')}
        />
        {set && (
          <ClearButton
            label={t('facets.priceClear')}
            onClick={() => onChange({ hrMin: undefined, hrMax: undefined, hrMaxExclusive: undefined })}
          />
        )}
      </div>
    </div>
  );
}
