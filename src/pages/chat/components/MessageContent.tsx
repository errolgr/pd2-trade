import React from 'react';
import { openUrl } from '@/lib/browser-opener';
import { ExternalLink } from 'lucide-react';
import { parseMessage } from '../lib/market-links';
import type { ChatListingState } from '../hooks/useChatListings';
import { ListingCard, ListingCardSkeleton, listingPillClass } from './ListingCard';

interface MessageContentProps {
  content: string;
  /** Looked-up listings by id; a link renders as an item pill once its listing is known, else as a plain link pill. */
  listings?: ReadonlyMap<string, ChatListingState>;
}

export function MessageContent({ content, listings }: MessageContentProps) {
  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    openUrl(url);
  };

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parseMessage(content).map((segment, index) => {
        if (segment.type === 'text') return <span key={index}>{segment.content}</span>;

        const state = listings?.get(segment.listingId);
        if (state?.status === 'loading') return <ListingCardSkeleton key={index} />;
        if (state?.status === 'listed' || state?.status === 'unlisted') {
          return (
            <ListingCard key={index}
              listing={state.listing}
              listed={state.status === 'listed'}
              url={segment.url} />
          );
        }
        return (
          <a
            key={index}
            href={segment.url}
            onClick={(e) => handleLinkClick(e, segment.url)}
            className={listingPillClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
              <ExternalLink className="size-3.5" />
            </span>
            <span className="truncate font-medium text-info">{segment.content}</span>
          </a>
        );
      })}
    </div>
  );
}
