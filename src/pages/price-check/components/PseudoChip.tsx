import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import { springSnappy } from '@/lib/motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PseudoOption } from '@/pages/price-check/lib/pseudo-fold';
import { useTranslation } from '@/i18n';

/**
 * The Σ chip on a resist row (or a folded Σ row): a menu of the totals the row feeds. Picking one folds the rows
 * it covers into it; picking the active one unfolds.
 */
export function PseudoChip({
  options,
  active,
  onPick,
}: {
  options: PseudoOption[];
  /** The Σ total this row shows, on a folded Σ row. */
  active?: string;
  onPick: (id: string) => void;
}) {
  const { t } = useTranslation('priceCheck');
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <motion.button
          type="button"
          aria-label={active ? t('pseudoChip.changeOrUnfold') : t('pseudoChip.searchTotalAria')}
          title={active ? t('pseudoChip.changeOrUnfold') : t('pseudoChip.searchTotalTitle')}
          // Inside the row's <label>: keep the click from toggling the row's checkbox
          onClick={(e) => e.stopPropagation()}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={springSnappy}
          className={cn(
            'inline-flex size-5 shrink-0 items-center justify-center rounded-md border outline-none',
            'transition-[background-color,border-color,color,box-shadow] duration-(--dur-fast)',
            'focus-visible:ring-2 focus-visible:ring-ring/60',
            active
              ? 'border-info/60 bg-info/15 text-info shadow-[0_0_10px_-2px_var(--color-info)]'
              : 'border-border/80 text-muted-foreground hover:border-info/50 hover:text-info',
          )}
        >
          <motion.span
            className="flex"
            initial={false}
            animate={{ rotate: active ? 360 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <Sigma className="size-3" />
          </motion.span>
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start"
        className="min-w-56">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
          {t('pseudoChip.menuLabel')}
        </DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuItem key={o.id}
            onSelect={() => onPick(o.id)}
            className="gap-2">
            <Sigma className={cn('size-3.5', o.id === active ? 'text-info' : 'text-muted-foreground')} />
            <span className="flex-1">{o.name}</span>
            <span className="tabular-nums text-muted-foreground">{o.value}</span>
            <Check className={cn('size-3.5 text-info', o.id !== active && 'invisible')} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
