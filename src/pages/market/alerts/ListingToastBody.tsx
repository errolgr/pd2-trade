import React, { useEffect, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ItemTooltip } from '@/pages/market/components/ItemTooltip';
import { useListingLookup } from './listing-lookup';
import { useTranslation } from '@/i18n';

/**
 * A toast's text with a card shown beside the toast while the pointer is on it (none while `card` is null). The card
 * ignores the pointer: it closes as soon as the pointer leaves the toast.
 */
export function ToastHoverCard({ card, children }: { card: React.ReactNode | null; children: React.ReactNode }) {
  const { t } = useTranslation('market');
  const ref = useRef<HTMLSpanElement>(null);
  /** The sonner toast around the text: hover target and card anchor. */
  const toastRef = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current?.closest<HTMLElement>('[data-sonner-toast]') ?? null;
    toastRef.current = el;
    if (!el) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <Popover open={hovered && card != null}>
      <PopoverAnchor virtualRef={toastRef as React.RefObject<HTMLElement>} />
      <span ref={ref}>{children}</span>
      {card != null && (
        <PopoverContent
          side="left"
          align="end"
          sideOffset={10}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-label={t('toast.itemTooltip')}
          className="pointer-events-none w-auto border-0 bg-transparent p-0 shadow-none"
        >
          {card}
        </PopoverContent>
      )}
    </Popover>
  );
}

/**
 * A watch toast's text. Looks the listing up as the toast appears, so pointing at the toast shows the item's
 * in-game tooltip beside it at once (none while the lookup runs or when it failed).
 */
export function ListingToastBody({ listingId, children }: { listingId: string; children: React.ReactNode }) {
  const lookup = useListingLookup(listingId);
  const listing = lookup.state === 'ready' ? lookup.detail.listing : null;
  return (
    <ToastHoverCard card={listing && <ItemTooltip item={listing.item}
      className="w-72 bg-popover shadow-panel" />}>
      {children}
    </ToastHoverCard>
  );
}
