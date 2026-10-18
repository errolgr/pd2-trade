import React from 'react';
import { cn } from '@/lib/utils';

/*
 * Building blocks of the price-check market popovers (uniques' price popover, rares' appraisal popover),
 * so both read the same: label tiles, key-value rows and section titles.
 */

/** Small label + value tile ("AVERAGE 3.80 HR"); `emphasis` highlights the headline tile. */
export function PopoverTile({
  label,
  emphasis,
  className,
  style,
  children,
}: {
  label: React.ReactNode;
  emphasis?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-md border px-2.5 py-1.5',
        emphasis ? 'border-glow/40 bg-glow/10' : 'border-border/60 bg-muted/40',
        className,
      )}
      style={style}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-sm tabular-nums', emphasis ? 'font-bold text-foreground' : 'font-medium')}>
        {children}
      </div>
    </div>
  );
}

/** "Samples: 84" row; group several in a `space-y-1 border-t border-border pt-2 text-xs` block. */
export function PopoverKeyValue({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="min-w-0 truncate text-right tabular-nums">{children}</span>
    </div>
  );
}

/** Section title ("Top Corruptions"), optionally with muted text on the right. */
export function PopoverSectionTitle({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold', className)}>
      <span>{children}</span>
      {aside && <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">{aside}</span>}
    </div>
  );
}
