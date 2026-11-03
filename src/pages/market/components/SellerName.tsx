import React from 'react';
import { Button, cn } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';

/**
 * A seller's name that opens their trader panel (the chat thread with the Trader sidebar). Stops the click so a
 * surrounding row/card isn't selected too.
 */
export function SellerName({
  onOpen,
  className,
  children,
}: {
  onOpen: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('market');
  return (
    <Button
      type="button"
      variant="link"
      size="inline"
      title={t('seller.openTrader')}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        'inline-block min-w-0 cursor-pointer truncate rounded-sm text-left font-normal text-inherit underline-offset-2 focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </Button>
  );
}
