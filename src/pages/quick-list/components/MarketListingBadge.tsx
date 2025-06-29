import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Check, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import moment from 'moment';
import { emit } from '@tauri-apps/api/event';
import { PD2Website } from '@/common/constants';
import { openUrl } from '@tauri-apps/plugin-opener';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

interface MarketListingBadgeProps {
  stashItem: GameStashItem;
  currentListings: MarketListingEntry[];
  onBump: (marketId: string, itemHash: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  deleteMarketListing: (listingId: string) => Promise<void>;
}

const MarketListingBadge: React.FC<MarketListingBadgeProps> = ({
  stashItem,
  currentListings,
  onBump,
  deleteMarketListing,
  onRefresh
}) => {
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [justBumped, setJustBumped] = useState<string | null>(null);
  const [bumping, setBumping] = useState<string | null>(null);

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
      emit('toast-event', 'Item bumped successfully!');
    } catch (err) {
      console.error('Failed to bump item:', err);
      emit('toast-event', 'Failed to bump item');
    } finally {
      setBumping(null);
    }
  };

  const listing = safeCurrentListings.find((c) => c.item.hash == stashItem.hash);

  if (!listing) {
    return null;
  }

  return (
    <div className='flex flex-row items-center gap-2'>
        <span
      onMouseEnter={() => setHoveredHash(stashItem.hash)}
      onMouseLeave={() => {
        setHoveredHash(null);
        setJustBumped(null);
      }}
      style={{ display: 'inline-block', position: 'relative' }}
    >
      {justBumped === stashItem.hash ? (
        <Badge variant="secondary" className="text-xs rounded-lg flex items-center gap-1 justify-center w-13 h-5" style={{ background: 'white', color: 'black' }}>
          <Check className="w-3 h-3" />
        </Badge>
      ) : hoveredHash === stashItem.hash ? (
        canBump(stashItem) ? (
          <Badge
            asChild
            className="text-xs rounded-lg cursor-pointer flex items-center gap-1 justify-center w-13 h-5"
            style={{ background: 'white', color: 'black' }}
            onClick={handleBump}
          >
            <span>Bump</span>
          </Badge>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span>
                <Badge 
                    variant="secondary" 
                    className="text-xs rounded-lg bg-green-600 text-white cursor-not-allowed flex items-center gap-1 justify-center w-13 h-5">
                Listed
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {`You can bump this item ${timeUntilBump(stashItem)}`}
            </TooltipContent>
          </Tooltip>
        )
      ) : (
        <Badge 
            variant="secondary"
            className="text-xs rounded-lg bg-green-600 text-white flex items-center gap-1 justify-center w-13 h-5">
            Listed
        </Badge>
      )}
    </span>
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
            <Trash2 
                className="w-4 h-4 p-0 hover:opacity-70 transition-opacity cursor-pointer text-red-500" 
            onClick={() => {
             deleteMarketListing(listing._id).then(() => {
                onRefresh();
                emit('toast-event', `Removed ${stashItem?.name || ''} market listing.`);
                getCurrentWebviewWindow().hide();
             })
             
           }}
         />
            </TooltipTrigger>
            <TooltipContent>
              {`Remove listing`}
            </TooltipContent>
          </Tooltip>
    
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
            <SquareArrowOutUpRight 
                className="w-4 h-4 p-0 hover:opacity-70 transition-opacity cursor-pointer" 
            onClick={() => {
             openUrl(`${PD2Website.Website}/market/listing/${listing._id}`)
           }}
         />
            </TooltipTrigger>
            <TooltipContent>
              {`Go to trade website`}
            </TooltipContent>
          </Tooltip>

    
    </div>
    
    
  );
};

export default MarketListingBadge; 