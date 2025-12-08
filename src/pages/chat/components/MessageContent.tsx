import React from 'react';
import { openUrl } from '@/lib/browser-opener';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageContentProps {
  content: string;
  isOwnMessage: boolean;
}

// Regex to match market listing URLs
// Matches: https://www.projectdiablo2.com/market/listing/ID?display="Name" or ?display=Name
const MARKET_LISTING_URL_REGEX = /https?:\/\/www\.projectdiablo2\.com\/market\/listing\/([a-f0-9]+)(?:\?display=((?:"[^"]+")|(?:[^\s"<>]+)))?/gi;

interface ParsedSegment {
  type: 'text' | 'link';
  content: string;
  url?: string;
  listingId?: string;
  displayName?: string;
}

export function MessageContent({ content, isOwnMessage }: MessageContentProps) {
  const parseContent = (text: string): ParsedSegment[] => {
    const segments: ParsedSegment[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    MARKET_LISTING_URL_REGEX.lastIndex = 0;

    while ((match = MARKET_LISTING_URL_REGEX.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
        });
      }

      // Extract listing ID and display name
      const listingId = match[1];
      let displayName: string | null = null;
      if (match[2]) {
        // Remove quotes if present and decode URI
        const rawDisplay = match[2].replace(/^["']|["']$/g, '');
        displayName = decodeURIComponent(rawDisplay);
      }
      const fullUrl = match[0];

      segments.push({
        type: 'link',
        content: displayName || `Market Listing ${listingId.substring(0, 8)}...`,
        url: fullUrl,
        listingId,
        displayName: displayName || undefined,
      });

      lastIndex = MARKET_LISTING_URL_REGEX.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    return segments.length > 0 ? segments : [{ type: 'text', content: text }];
  };

  const segments = parseContent(content);

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    openUrl(url);
  };

  return (
    <div className="text-sm whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <a
              key={index}
              href={segment.url}
              onClick={(e) => handleLinkClick(e, segment.url!)}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors",
                "hover:underline",
                isOwnMessage
                  ? "bg-blue-600 text-blue-100 hover:bg-blue-700"
                  : "bg-blue-700 text-blue-200 hover:bg-blue-600"
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              {segment.content}
            </a>
          );
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </div>
  );
}

