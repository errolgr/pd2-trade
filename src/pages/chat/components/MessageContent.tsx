import React, { useMemo } from 'react';
import { openUrl } from '@/lib/browser-opener';
import { ExternalLink } from 'lucide-react';
import { findMarketLinks, parseMessage } from '../lib/market-links';
import { type ChatListingState, useChatListings } from '../hooks/useChatListings';
import { cn } from '@/lib/utils';
import { ListingCard, ListingCardSkeleton, listingIconBoxClass, listingPillClass } from './ListingCard';

/** A message shown outside a thread (a toast): it looks its listing links up itself, for their item pills. */
export function LinkedMessageContent({ content }: { content: string }) {
  const listingIds = useMemo(() => findMarketLinks(content).map((link) => link.listingId), [content]);
  const listings = useChatListings(listingIds);
  return <MessageContent content={content}
    listings={listings} />;
}

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
            <span className={cn(listingIconBoxClass, 'text-muted-foreground')}>
              <ExternalLink className="size-3.5" />
            </span>
            <span className="truncate font-semibold text-info">{segment.content}</span>
          </a>
        );
      })}
    </div>
  );
}
