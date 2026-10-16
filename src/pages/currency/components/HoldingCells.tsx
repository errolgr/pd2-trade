import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BACKEND_URL } from '@/lib/pkce';
import type { ValuationLine } from '@/lib/networth-api';
import { CATEGORY_COLORS } from '../lib/networth-format';

export function HoldingName({ line, showTab = false }: { line: ValuationLine; showTab?: boolean }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {line.iconPath ? (
        <img
          src={line.iconPath.startsWith('/assets/') ? `${BACKEND_URL}${line.iconPath}` : line.iconPath}
          alt=""
          className="h-5 w-5 shrink-0 object-contain"
        />
      ) : (
        <span className="h-2 w-2 mx-1.5 shrink-0 rounded-full"
          style={{ background: CATEGORY_COLORS[line.category] }} />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm">{line.name}</p>
        {showTab && line.tab && <p className="truncate text-[11px] text-muted-foreground">{line.tab}</p>}
      </div>
    </div>
  );
}

export function PriceChange({ percent }: { percent: number | null }) {
  if (percent === null || percent === undefined) return <span className="text-muted-foreground">—</span>;
  const rounded = Math.round(percent);
  return (
    <span
      className={cn(
        'tabular-nums text-xs',
        rounded > 0 ? 'text-emerald-400' : rounded < 0 ? 'text-red-400' : 'text-muted-foreground',
      )}
    >
      {rounded > 0 ? '▲' : rounded < 0 ? '▼' : ''}
      {Math.abs(rounded)}%
    </span>
  );
}

const CONFIDENCE_LABELS: Record<ValuationLine['confidence'], { label: string; className: string; hint: string }> = {
  ok: { label: 'market', className: 'text-muted-foreground', hint: '7-day market average' },
  fixed: { label: 'fixed', className: 'text-sky-300 border-sky-800', hint: 'Fixed rune value (few listings)' },
  low: {
    label: 'low',
    className: 'text-amber-300 border-amber-800',
    hint: 'Fewer than 10 listings — counted as uncertain, not in the total',
  },
  none: { label: 'unpriced', className: 'text-muted-foreground border-dashed', hint: 'No price data — valued at 0' },
};

export function ConfidenceBadge({ line }: { line: ValuationLine }) {
  const meta = CONFIDENCE_LABELS[line.confidence];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline"
          className={cn('font-normal', meta.className)}>
          {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {meta.hint}
        {line.sampleCount > 0 ? ` · ${line.sampleCount} listings` : ''}
      </TooltipContent>
    </Tooltip>
  );
}
