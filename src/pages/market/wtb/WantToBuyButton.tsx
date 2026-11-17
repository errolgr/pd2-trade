import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';
import type { MarketFilters } from '../lib/types';

/** The primary button's colours (as "Make offer"), at the toolbar's size. */
const PRIMARY =
  'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground hover:shadow-glow';

/**
 * "Want to buy" beside Watch: opens (accented while open) the post buy request pane for the current filters. Outline
 * on Live; the primary button on Wanted (posting is that source's main action); disabled on Sold, since sold
 * listings can't be asked for, like they can't be watched.
 */
export function WantToBuyButton({
  open,
  source,
  onToggle,
}: {
  open: boolean;
  source: MarketFilters['source'];
  onToggle: () => void;
}) {
  const { t } = useTranslation('market');
  const archive = source === 'archive';
  const label = archive ? t('wtb.button.archive') : t('wtb.button.label');
  return (
    // The span takes hover/focus while the button is disabled, so the tooltip still says why
    <Tip label={label}>
      <span
        tabIndex={archive ? 0 : undefined}
        className="inline-flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <button
          type="button"
          aria-pressed={open}
          aria-label={label}
          disabled={archive}
          onClick={onToggle}
          className={cn(
            'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium outline-none',
            'transition-[color,background-color,border-color,box-shadow] duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
            'disabled:cursor-not-allowed disabled:opacity-50',
            source === 'wanted'
              ? cn(PRIMARY, open && 'ring-2 ring-primary/40')
              : open
                ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                : 'border-input bg-background/40 text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <ShoppingCart className="size-3.5" />
          {t('wtb.button.text')}
        </button>
      </span>
    </Tip>
  );
}
