import React from 'react';
import { motion } from 'framer-motion';
import { Coins, Info, PackageOpen } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatHr } from '@/lib/utils';
import { EASE_OUT, listItem, listStagger } from '@/lib/motion';
import { NET_WORTH_CATEGORIES, type Valuation } from '@/lib/networth-api';
import { CATEGORY_COLORS, categoryLabel, formatUnitPrice } from '../lib/networth-format';
import { currentLocale, useTranslation } from '@/i18n';
import { ConfidenceBadge, HoldingName, PriceChange } from './HoldingCells';

const TOP_GRID = 'grid grid-cols-[1fr_3rem_4rem_5rem_3.5rem_5.5rem] items-center gap-2 px-3';

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold tracking-tight">{children}</h3>
      {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
    </div>
  );
}

export function OverviewTab({ valuation }: { valuation: Valuation }) {
  const { t } = useTranslation('currency');
  const total = valuation.totalHr;
  const shares = NET_WORTH_CATEGORIES.map((category) => ({
    category,
    value: valuation.byCategory[category] ?? 0,
  })).filter((s) => s.value > 0);
  const top = valuation.lines.filter((line) => line.value > 0).slice(0, 10);
  const tabs = Object.entries(valuation.byTab)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);
  const maxTab = tabs[0]?.[1] ?? 0;

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
          {total > 0 &&
            shares.map(({ category, value }, i) => (
              <Tooltip key={category}>
                <TooltipTrigger asChild>
                  <motion.div
                    className="h-full min-w-1 origin-left transition-[filter] duration-(--dur-fast) hover:brightness-125"
                    style={{ flex: `${value} 1 0%`, background: CATEGORY_COLORS[category] }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.45, delay: i * 0.04, ease: EASE_OUT }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {categoryLabel(category)} · {((value / total) * 100).toFixed(1)}% · {formatHr(value)}
                </TooltipContent>
              </Tooltip>
            ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {shares.map(({ category, value }) => (
            <span key={category}
              className="flex items-center gap-1.5">
              <span className="size-2 rounded-full"
                style={{ background: CATEGORY_COLORS[category] }} />
              <span className="text-foreground/90">{categoryLabel(category)}</span>
              <span className="tabular-nums">
                {((value / total) * 100).toFixed(0)}% · {value.toFixed(2)}
              </span>
            </span>
          ))}
          {shares.length === 0 && <span>{t('overview.noPricedHoldings')}</span>}
        </div>
      </section>

      <section>
        <SectionTitle aside={top.length > 0 ? t('overview.topAside', { count: top.length }) : undefined}>
          {t('overview.topHoldings')}
        </SectionTitle>
        <div className="overflow-hidden rounded-lg border border-border bg-card/40">
          <div
            className={`${TOP_GRID} border-b border-border bg-muted/30 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground`}
          >
            <span>{t('columns.item')}</span>
            <span className="text-right">{t('columns.qty')}</span>
            <span className="text-right">{t('columns.unit')}</span>
            <span className="text-right">{t('columns.value')}</span>
            <span className="text-right">{t('columns.change7d')}</span>
            <span className="text-right">{t('columns.price')}</span>
          </div>
          {top.length > 0 ? (
            <motion.div variants={listStagger}
              initial="hidden"
              animate="visible"
              className="divide-y divide-border/60">
              {top.map((line) => (
                <motion.div
                  key={`${line.key}|${line.tab ?? ''}`}
                  variants={listItem}
                  className={`${TOP_GRID} py-1.5 text-sm transition-colors duration-(--dur-fast) hover:bg-muted/40`}
                >
                  <HoldingName line={line}
                    showTab={line.tab !== null} />
                  <span className="text-right tabular-nums">{line.qty}</span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {formatUnitPrice(line.unitPrice)}
                  </span>
                  <span className="text-right font-medium tabular-nums">{line.value.toFixed(2)}</span>
                  <span className="text-right">
                    <PriceChange percent={line.priceChange7dPercent} />
                  </span>
                  <span className="flex justify-end">
                    <ConfidenceBadge line={line} />
                  </span>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-full bg-muted/60">
                <PackageOpen className="size-4" />
              </span>
              {t('overview.nothingPriced')}
            </div>
          )}
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 opacity-70" />
          <span>
            {t('overview.unpriced', { count: valuation.unpricedCount })} ·{' '}
            {t('overview.uncertain', { value: formatHr(valuation.uncertainHr) })} ·{' '}
            <Coins className="mb-0.5 inline size-3 text-q-gold" />{' '}
            {t('overview.gold', { amount: valuation.gold.toLocaleString(currentLocale()) })}
          </span>
        </p>
      </section>

      {tabs.length > 0 && (
        <section>
          <SectionTitle>{t('overview.byStashTab')}</SectionTitle>
          <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
            {tabs.map(([tab, value], i) => (
              <div key={tab}
                className="group grid grid-cols-[8rem_1fr_5rem] items-center gap-3 text-sm">
                <span className="truncate text-muted-foreground transition-colors duration-(--dur-fast) group-hover:text-foreground">
                  {tab}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-2 origin-left rounded-full bg-gradient-to-r from-primary/50 to-primary/80"
                    style={{ width: `${maxTab > 0 ? (value / maxTab) * 100 : 0}%` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.05, ease: EASE_OUT }}
                  />
                </div>
                <span className="text-right font-medium tabular-nums">{value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
