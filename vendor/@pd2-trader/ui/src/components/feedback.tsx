import * as React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

import { cn } from '../lib/utils';
import { useUiLabels } from '../lib/labels';
import { Button } from './button';
import { Skeleton } from './skeleton';

interface ErrorChipProps {
  message: React.ReactNode;
  /** Shows a Retry action (label from UiLabels). */
  onRetry?: () => void;
  className?: string;
}

/** Compact inline failure ("Couldn't load prices · Retry") for a section that failed while the rest still works. */
function ErrorChip({ message, onRetry, className }: ErrorChipProps) {
  const labels = useUiLabels();
  return (
    <div
      role="alert"
      data-slot="error-chip"
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border border-destructive/35 bg-destructive/10 py-0.5 pr-1 pl-2 text-2xs text-destructive',
        !onRetry && 'pr-2',
        className,
      )}
    >
      <AlertCircle aria-hidden
        className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{message}</span>
      {onRetry && (
        <Button
          variant="quiet"
          size="xs"
          className="h-5 rounded-full px-1.5 text-destructive hover:text-foreground"
          onClick={onRetry}
        >
          <RotateCw className="size-3" />
          {labels.retry}
        </Button>
      )}
    </div>
  );
}

interface SkeletonRowsProps {
  /** Number of placeholder rows. Default 3. */
  rows?: number;
  className?: string;
}

/** Loading placeholder for a list or table: `rows` label/value bars. */
function SkeletonRows({ rows = 3, className }: SkeletonRowsProps) {
  const labels = useUiLabels();
  return (
    <div
      role="status"
      aria-label={labels.loading}
      data-slot="skeleton-rows"
      className={cn('flex flex-col gap-2', className)}
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}
          className="flex items-center justify-between gap-4">
          <Skeleton className={cn('h-3.5', i % 2 ? 'w-2/5' : 'w-1/2')} />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

export { ErrorChip, SkeletonRows };
export type { ErrorChipProps, SkeletonRowsProps };
