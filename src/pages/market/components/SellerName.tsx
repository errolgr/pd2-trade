import React from 'react';
import { cn } from '@/lib/utils';

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
  return (
    <button
      type="button"
      title="Open trader"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={cn(
        'min-w-0 cursor-pointer truncate rounded-sm text-left underline-offset-2 outline-none hover:underline focus-visible:underline focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </button>
  );
}
