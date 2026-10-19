import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BACKEND_URL } from '@/lib/pkce';
import type { ValuationLine } from '@/lib/networth-api';
import { CATEGORY_COLORS, CATEGORY_NAME_CLASS } from '../lib/networth-format';

export function HoldingName({ line, showTab = false }: { line: ValuationLine; showTab?: boolean }) {
  const [iconFailed, setIconFailed] = useState(false);
  const showIcon = !!line.iconPath && !iconFailed;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40">
        {showIcon ? (
          <img
            src={
              line.iconPath?.startsWith('/assets/') ? `${BACKEND_URL}${line.iconPath}` : (line.iconPath ?? undefined)
            }
            alt=""
            loading="lazy"
            onError={() => setIconFailed(true)}
            className="size-5 object-contain"
          />
        ) : (
          <span
            className="size-2 rounded-full ring-2 ring-background"
            style={{ background: CATEGORY_COLORS[line.category] }}
          />
        )}
      </span>
      <div className="min-w-0 leading-tight">
        <p className={cn('truncate text-sm font-medium', CATEGORY_NAME_CLASS[line.category] ?? 'text-foreground')}>
          {line.name}
        </p>
        {showTab && line.tab && <p className="truncate text-[11px] text-muted-foreground">{line.tab}</p>}
      </div>
    </div>
  );
}

export function PriceChange({ percent }: { percent: number | null }) {
  if (percent === null || percent === undefined) return <span className="text-muted-foreground/70">—</span>;
  const rounded = Math.round(percent);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded px-1 py-px text-[11px] font-medium tabular-nums',
        rounded > 0
          ? 'bg-success/12 text-success'
          : rounded < 0
            ? 'bg-destructive/12 text-destructive'
            : 'text-muted-foreground',
      )}
    >
      {rounded > 0 ? '▲' : rounded < 0 ? '▼' : ''}
      {Math.abs(rounded)}%
    </span>
  );
}

const CONFIDENCE_LABELS: Record<
  ValuationLine['confidence'],
  { label: string; className: string; dot: string; hint: string }
> = {
  ok: {
    label: 'market',
    className: 'text-muted-foreground border-border bg-muted/40',
    dot: 'bg-success',
    hint: '7-day market average',
  },
  fixed: {
    label: 'fixed',
    className: 'text-info border-info/35 bg-info/10',
    dot: 'bg-info',
    hint: 'Fixed rune value (few listings)',
  },
  low: {
    label: 'low',
    className: 'text-warning border-warning/40 bg-warning/10',
    dot: 'bg-warning',
    hint: 'Fewer than 10 listings — counted as uncertain, not in the total',
  },
  none: {
    label: 'unpriced',
    className: 'text-muted-foreground border-dashed border-muted-foreground/40',
    dot: 'bg-muted-foreground/50',
    hint: 'No price data — valued at 0',
  },
};

export function ConfidenceBadge({ line }: { line: ValuationLine }) {
  const meta = CONFIDENCE_LABELS[line.confidence];
  return (
    <Tooltip>
      {/* Span trigger: Badge has no forwardRef (React 18), so Radix could not anchor the tooltip on it */}
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex cursor-help rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Badge
            variant="outline"
            className={cn(
              'gap-1 rounded-full px-2 font-normal transition-[filter] duration-(--dur-fast) hover:brightness-110',
              meta.className,
            )}
          >
            <span aria-hidden
              className={cn('size-1.5 rounded-full', meta.dot)} />
            {meta.label}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {meta.hint}
        {line.sampleCount > 0 ? ` · ${line.sampleCount} listings` : ''}
      </TooltipContent>
    </Tooltip>
  );
}
