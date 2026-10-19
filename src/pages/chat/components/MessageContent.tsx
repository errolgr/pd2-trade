import React from 'react';
import { openUrl } from '@/lib/browser-opener';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseMessage } from '../lib/market-links';
import type { ChatListingState } from '../hooks/useChatListings';
import { ListingCard, ListingCardSkeleton } from './ListingCard';

interface MessageContentProps {
  content: string;
  isOwnMessage: boolean;
  /** Looked-up listings by id; a link renders as an item card once its listing is known, else as a link chip. */
  listings?: ReadonlyMap<string, ChatListingState>;
}

export function MessageContent({ content, isOwnMessage, listings }: MessageContentProps) {
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
            className={cn(
              'mx-0.5 inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 align-middle font-medium',
              'transition-[color,background-color,border-color,transform] duration-(--dur-fast) ease-out',
              'hover:underline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              isOwnMessage
                ? 'border-info/40 bg-info/20 text-info hover:bg-info/30'
                : 'border-info/30 bg-info/10 text-info hover:bg-info/20',
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-3 shrink-0" />
            <span className="truncate">{segment.content}</span>
          </a>
        );
      })}
    </div>
  );
}
