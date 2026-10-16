import { cva } from 'class-variance-authority';

/** Shared item card surface for quick-list, manage, queue and delist rows. */
export const itemCard = cva(
  'group/card relative rounded-lg border bg-card/60 p-3 text-card-foreground shadow-xs transition-[border-color,background-color,box-shadow,opacity,transform] duration-(--dur-fast) ease-out',
  {
    variants: {
      tone: {
        static: 'border-border',
        interactive:
          'cursor-pointer border-border outline-none hover:border-ring/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-[0.995]',
        selected:
          'cursor-pointer border-primary/70 bg-primary/8 shadow-glow outline-none ring-1 ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring/60',
        danger:
          'cursor-pointer border-border outline-none hover:border-destructive/60 hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/50',
      },
    },
    defaultVariants: { tone: 'static' },
  },
);

/** Small uppercase section label used above lists. */
export const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

/** Count chip shown next to section labels and tab names. */
export const countChip =
  'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold tabular-nums leading-none text-primary';
