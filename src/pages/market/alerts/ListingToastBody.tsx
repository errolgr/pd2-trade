import React, { useEffect, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { ItemTooltip } from '@/pages/market/components/ItemTooltip';
import { useListingLookup } from './listing-lookup';

/**
 * A watch toast's text. Looks the listing up as the toast appears, so pointing at the toast shows the item's
 * in-game tooltip beside it at once (none while the lookup runs or when it failed). The tooltip ignores the
 * pointer: it closes as soon as the pointer leaves the toast.
 */
export function ListingToastBody({ listingId, children }: { listingId: string; children: React.ReactNode }) {
  const lookup = useListingLookup(listingId);
  const ref = useRef<HTMLSpanElement>(null);
  /** The sonner toast around the text: hover target and tooltip anchor. */
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

  const listing = lookup.state === 'ready' ? lookup.detail.listing : null;
  return (
    <Popover open={hovered && !!listing}>
      <PopoverAnchor virtualRef={toastRef as React.RefObject<HTMLElement>} />
      <span ref={ref}>{children}</span>
      {listing && (
        <PopoverContent
          side="left"
          align="end"
          sideOffset={10}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-label="Item tooltip"
          className="pointer-events-none w-72 border-0 bg-transparent p-0 shadow-none"
        >
          <ItemTooltip item={listing.item}
            className="bg-popover shadow-panel" />
        </PopoverContent>
      )}
    </Popover>
  );
}
