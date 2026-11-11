import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/components/ui/tooltip';
import { currentLocale, useTranslation } from '@/i18n';
import type { Relaxation } from '../hooks/useRelaxations';

/** A relaxation as a chip: its label (the filter it drops, or the change it makes) and how it counted. */
export interface RelaxationChip {
  id: string;
  label: string;
  counting: boolean;
  total: number;
  totalExact: boolean;
}

/** Relaxations with their labels, for RelaxationChips. */
export function relaxationChips<T>(relaxations: Relaxation<T>[], label: (value: T) => string): RelaxationChip[] {
  return relaxations.map(({ id, value, counting, total, totalExact }) => ({
    id,
    label: label(value),
    counting,
    total,
    totalExact,
  }));
}

/**
 * An empty search's filters as chips, each with what the search finds without it, filling in as the counts land
 * (a pulsing badge until then). The one that finds the most is marked; the order stays put, so chips don't jump
 * as counts arrive. A click drops that filter (`onPick`); hovering marks where it is (`onHover`).
 */
export function RelaxationChips({
  chips,
  onPick,
  onHover,
}: {
  chips: RelaxationChip[];
  onPick: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const { t } = useTranslation('market');
  const counted = chips.filter((c) => !c.counting);
  const best = counted.length > 0 ? Math.max(...counted.map((c) => c.total)) : 0;
  const count = (c: RelaxationChip) => `${c.total.toLocaleString(currentLocale())}${c.totalExact ? '' : '+'}`;
  return (
    <ul aria-label={t('results.relaxLabel')}
      className="flex max-w-md flex-wrap justify-center gap-1.5">
      {chips.map((c) => {
        const top = !c.counting && best > 0 && c.total === best;
        const name = t('results.relaxDrop', { filter: c.label });
        return (
          <li key={c.id}
            className="min-w-0 max-w-full">
            <Tip label={name}>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                onMouseEnter={() => onHover?.(c.id)}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => onHover?.(c.id)}
                onBlur={() => onHover?.(null)}
                aria-label={c.counting ? name : t('results.relaxDropCount', { filter: c.label, count: count(c) })}
                className={cn(
                  'group inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border pr-1.5 pl-3 text-xs outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
                  top
                    ? 'border-primary/70 bg-primary/12 text-foreground hover:bg-primary/20'
                    : 'border-border text-foreground hover:border-foreground/40 hover:bg-accent/50',
                )}
              >
                <span className="min-w-0 truncate">{c.label}</span>
                {c.counting ? (
                  <span aria-hidden
                    className="h-4 w-8 shrink-0 animate-pulse rounded-full bg-muted-foreground/25" />
                ) : (
                  <span
                    aria-hidden
                    className={cn(
                      'inline-flex h-4 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                      'animate-in fade-in-0 zoom-in-90 duration-150',
                      top ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    )}
                  >
                    {count(c)}
                  </span>
                )}
                <X
                  aria-hidden
                  className="size-3 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                />
              </button>
            </Tip>
          </li>
        );
      })}
    </ul>
  );
}
