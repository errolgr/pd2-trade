import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useItems } from '@/hooks/useItems';
import { type ArtItem, listingArtCandidates } from '@/pages/chat/lib/listing-art';
import type { MarketFilters } from '../lib/types';
import { wtbArt } from './wtb-text';

/**
 * A buy request's item picture on the listing thumbnail's tile (the listing art lookup: unique/set art, else the
 * base's, else the type's first base). Nothing at all, not an empty tile, when no art matches or none loads.
 */
export function WtbItemArt({
  filters,
  className,
  artClassName = 'max-h-7 max-w-7',
}: {
  filters: Pick<MarketFilters, 'itemName' | 'baseCode' | 'typeCode'>;
  className?: string;
  artClassName?: string;
}) {
  const { itemsMapByKey } = useItems();
  const { itemName, baseCode, typeCode } = filters;
  const candidates = useMemo(() => {
    const art = wtbArt({ itemName, baseCode, typeCode });
    if (!art) return [];
    const item = {
      name: art.name,
      quality: art.quality ? { name: art.quality } : undefined,
      base: art.baseName ? { name: art.baseName } : undefined,
    } as unknown as ArtItem;
    return listingArtCandidates(item, itemsMapByKey);
  }, [itemName, baseCode, typeCode, itemsMapByKey]);
  const [failed, setFailed] = useState<string[]>([]);
  const src = candidates.find((url) => !failed.includes(url));
  if (!src) return null;
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-linear-to-b from-muted/80 to-muted/40 shadow-xs',
        className,
      )}
    >
      <img
        src={src}
        alt=""
        className={cn('object-contain', artClassName)}
        onError={() => setFailed((list) => [...list, src])}
      />
    </span>
  );
}
