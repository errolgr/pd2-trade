import React from 'react';
import { AlertTriangle, RotateCw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { TONES, type Tone } from '@pd2-trader/plugin-sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Slot components (PRD A2.4): the only components plugin slot output renders with. Names and props match the
 * `@pd2-trader/ui` slot components (feat/ds-components) so the import swaps 1:1 once that package lands.
 */

export type SlotTone = Tone;
export const SLOT_TONES = TONES;

const TONE_TEXT: Record<SlotTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  'q-unique': 'text-q-unique',
  'q-set': 'text-q-set',
  'q-rare': 'text-q-rare',
  'q-magic': 'text-q-magic',
  'q-crafted': 'text-q-crafted',
  'q-rune': 'text-q-rune',
};

const TONE_BADGE: Record<SlotTone, string> = {
  default: 'border-border bg-secondary text-secondary-foreground',
  muted: 'border-border bg-muted text-muted-foreground',
  success: 'border-success/35 bg-success/15 text-success',
  warning: 'border-warning/35 bg-warning/15 text-warning',
  danger: 'border-destructive/35 bg-destructive/15 text-destructive',
  'q-unique': 'border-q-unique/35 bg-q-unique/10 text-q-unique',
  'q-set': 'border-q-set/35 bg-q-set/10 text-q-set',
  'q-rare': 'border-q-rare/35 bg-q-rare/10 text-q-rare',
  'q-magic': 'border-q-magic/35 bg-q-magic/10 text-q-magic',
  'q-crafted': 'border-q-crafted/35 bg-q-crafted/10 text-q-crafted',
  'q-rune': 'border-q-rune/35 bg-q-rune/10 text-q-rune',
};

export const toneTextClass = (tone: SlotTone | undefined) => TONE_TEXT[tone ?? 'default'];

export function SlotSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-1 rounded-md border border-border bg-card/60 p-2', className)}>
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

export function SlotRow({ label, value, tone }: { label: React.ReactNode; value: React.ReactNode; tone?: SlotTone }) {
  return (
    <div className="flex min-h-5 items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className={cn('shrink-0 font-medium tabular-nums', toneTextClass(tone))}>{value}</span>
    </div>
  );
}

export function SlotBadge({ text, tone }: { text: string; tone?: SlotTone }) {
  return (
    <Badge variant="outline"
      className={cn('rounded-sm px-1.5 py-0 text-xs', TONE_BADGE[tone ?? 'default'])}>
      {text}
    </Badge>
  );
}

export function SlotText({ text, tone, size = 'md' }: { text: string; tone?: SlotTone; size?: 'sm' | 'md' }) {
  return <p className={cn('text-xs', size === 'sm' && 'leading-tight', toneTextClass(tone ?? 'default'))}>{text}</p>;
}

export function SlotColumn({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

export function SlotList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <li key={i}
          className="flex items-start gap-1.5 text-xs">
          <span aria-hidden
            className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
          <div className="min-w-0 flex-1">{item}</div>
        </li>
      ))}
    </ul>
  );
}

export function SlotDivider() {
  return <Separator className="my-0.5" />;
}

export function SlotAction({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button size="sm"
      variant="secondary"
      className="h-7 px-2.5 text-xs"
      disabled={disabled}
      onClick={onClick}>
      {label}
    </Button>
  );
}

export function PriceTag({
  amount,
  unit,
  trend,
  className,
}: {
  amount: number;
  unit: 'hr' | 'rune' | 'gold';
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}) {
  const { t } = useTranslation('plugins');
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : trend === 'flat' ? Minus : null;
  const formatted = amount.toLocaleString(undefined, { maximumFractionDigits: amount < 10 ? 2 : 0 });
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium tabular-nums', unit === 'gold' && 'text-q-gold', className)}>
      {t(`price.${unit}`, { value: formatted })}
      {TrendIcon && (
        <TrendIcon aria-hidden
          className={cn('size-3', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')} />
      )}
    </span>
  );
}

export function ErrorChip({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation('plugins');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex h-5 w-fit items-center gap-1 rounded-sm border border-destructive/35 bg-destructive/10 px-1.5 text-xs text-destructive">
          <AlertTriangle aria-hidden
            className="size-3" />
          {t('slot.error')}
          {onRetry && (
            <Button type="button"
              variant="ghost"
              size="icon"
              aria-label={t('slot.retry')}
              className="size-4 rounded-sm text-destructive hover:bg-destructive/15 hover:text-destructive"
              onClick={onRetry}>
              <RotateCw aria-hidden
                className="size-3" />
            </Button>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}

/** Late slot: a skeleton shaped like a short section (core content renders first; slots fill in). */
export function SlotSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border p-2">
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i}
          className="h-3 w-full" />
      ))}
    </div>
  );
}
