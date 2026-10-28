import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ArrowUp, Check, Loader2, SquareArrowOutUpRight, Trash2 } from 'lucide-react';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import moment from 'moment';
import { PD2Website } from '@/common/constants';
import { openUrl } from '@/lib/browser-opener';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import { showToast, usePanel } from '@/overlay';

interface MarketListingBadgeProps {
  stashItem: GameStashItem;
  currentListings: MarketListingEntry[];
  onBump: (marketId: string, itemHash: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  deleteMarketListing: (listingId: string) => Promise<void>;
}

const pill =
  'inline-flex h-6 w-16 select-none items-center justify-center gap-1 rounded-full border text-[11px] font-semibold leading-none';
const iconButton =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-(--dur-fast) ease-out focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-90 [&_svg]:size-4';
const swap = { duration: DUR.fast, ease: EASE_OUT };

const MarketListingBadge: React.FC<MarketListingBadgeProps> = ({
  stashItem,
  currentListings,
  onBump,
  deleteMarketListing,
  onRefresh,
}) => {
  const { close } = usePanel<'quickList'>();
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [justBumped, setJustBumped] = useState<string | null>(null);
  const [bumping, setBumping] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Ensure currentListings is always an array
  const safeCurrentListings = Array.isArray(currentListings) ? currentListings : [];

  const canBump = (stashItem: GameStashItem) => {
    const itemData = safeCurrentListings.find((c) => c.item.hash === stashItem.hash);
    if (!itemData || !itemData.bumped_at) return true;
    const lastBump = moment(itemData.bumped_at);
    const now = moment();
    return now.diff(lastBump, 'hours') >= 12;
  };

  const timeUntilBump = (stashItem: GameStashItem) => {
    const itemData = safeCurrentListings.find((c) => c.item.hash === stashItem.hash);
    if (!itemData || !itemData.bumped_at) return '';
    const lastBump = moment(itemData.bumped_at);
    const nextBump = lastBump.clone().add(12, 'hours');
    return nextBump.fromNow();
  };

  const handleBump = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBumping(stashItem.hash);
    try {
      const marketId = safeCurrentListings.find((c) => c.item.hash == stashItem.hash)?._id;
      if (!marketId) {
        throw new Error('Market listing not found');
      }
      await onBump(marketId, stashItem.hash);
      await onRefresh();
      setJustBumped(stashItem.hash);
      showToast('Item bumped successfully!');
    } catch (err) {
      console.error('Failed to bump item:', err);
      showToast('Failed to bump item');
    } finally {
      setBumping(null);
    }
  };

  const listing = safeCurrentListings.find((c) => c.item.hash == stashItem.hash);

  if (!listing) {
    return null;
  }

  const listedPill = (cooldown: boolean) => (
    <span className={cn(pill, 'border-success/35 bg-success/12 text-success', cooldown && 'cursor-not-allowed')}>
      <span className="size-1.5 rounded-full bg-current" />
      Listed
    </span>
  );

  let state: 'bumped' | 'bump' | 'cooldown' | 'listed' = 'listed';
  if (justBumped === stashItem.hash) state = 'bumped';
  else if (hoveredHash === stashItem.hash) state = canBump(stashItem) ? 'bump' : 'cooldown';

  return (
    <div className="flex flex-row items-center gap-1">
      <span
        onMouseEnter={() => setHoveredHash(stashItem.hash)}
        onMouseLeave={() => {
          setHoveredHash(null);
          setJustBumped(null);
        }}
        className="relative inline-block pr-1.5"
      >
        <motion.span
          key={state}
          className="inline-flex"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={swap}
        >
          {state === 'bumped' ? (
            <span className={cn(pill, 'border-success/40 bg-success text-success-foreground')}>
              <Check className="size-3" />
            </span>
          ) : state === 'bump' ? (
            <button
              type="button"
              className={cn(
                pill,
                'cursor-pointer border-primary/40 bg-primary text-primary-foreground shadow-sm outline-none transition-[box-shadow,transform] duration-(--dur-fast) hover:shadow-glow focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-95 disabled:opacity-70',
              )}
              onClick={handleBump}
              disabled={bumping === stashItem.hash}
            >
              {bumping === stashItem.hash ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <ArrowUp className="size-3" />
              )}
              Bump
            </button>
          ) : state === 'cooldown' ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>{listedPill(true)}</TooltipTrigger>
              <TooltipContent>{`You can bump this item ${timeUntilBump(stashItem)}`}</TooltipContent>
            </Tooltip>
          ) : (
            listedPill(false)
          )}
        </motion.span>
      </span>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Remove listing"
            disabled={deleting}
            className={cn(iconButton, 'text-destructive/80 hover:bg-destructive/15 hover:text-destructive')}
            onClick={async (e) => {
              e.stopPropagation();
              setDeleting(true);
              try {
                await deleteMarketListing(listing._id);
                await onRefresh();
                showToast(`Removed ${stashItem?.name || ''} market listing.`);
                close();
              } catch (err) {
                console.error('Failed to remove listing:', err);
                showToast('Failed to remove listing');
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{`Remove listing`}</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Go to trade website"
            className={cn(iconButton, 'hover:bg-accent hover:text-accent-foreground')}
            onClick={(e) => {
              e.stopPropagation();
              openUrl(`${PD2Website.Website}/market/listing/${listing._id}`);
            }}
          >
            <SquareArrowOutUpRight />
          </button>
        </TooltipTrigger>
        <TooltipContent>{`Go to trade website`}</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default MarketListingBadge;
