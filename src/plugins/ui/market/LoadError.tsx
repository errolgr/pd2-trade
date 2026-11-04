import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Banner, Button, Skeleton } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';

export function LoadError({ onRetry, title }: { onRetry: () => void; title?: string }) {
  const { t } = useTranslation('plugins');
  return (
    <Banner
      tone="destructive"
      role="alert"
      icon={<AlertTriangle />}
      actions={
        <Button size="sm"
          variant="outline"
          onClick={onRetry}>
          {t('marketplace.retry')}
        </Button>
      }
    >
      <span className="block font-medium">{title ?? t('marketplace.loadFailed')}</span>
      <span className="block text-xs text-muted-foreground">{t('marketplace.loadFailedHint')}</span>
    </Banner>
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card/60 p-2.5">
      <div className="flex gap-2">
        <Skeleton className="size-9" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
