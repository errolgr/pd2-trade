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
const MARKET_LISTING_URL_REGEX =
  /https?:\/\/www\.projectdiablo2\.com\/market\/listing\/([a-f0-9]+)(?:\?display=((?:"[^"]+")|(?:[^\s"<>]+)))?/gi;

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

    // Create a new regex instance to avoid modifying the global one
    const regex = new RegExp(MARKET_LISTING_URL_REGEX.source, MARKET_LISTING_URL_REGEX.flags);
    const matches: Array<{
      matchStart: number;
      matchEnd: number;
      listingId: string;
      displayName: string | null;
      fullUrl: string;
    }> = [];

    // First pass: collect all matches
    while ((match = regex.exec(text)) !== null) {
      const listingId = match[1];
      let displayName: string | null = null;
      if (match[2]) {
        // Remove quotes if present and decode URI
        const rawDisplay = match[2].replace(/^["']|["']$/g, '');
        displayName = decodeURIComponent(rawDisplay);
      }
      const fullUrl = match[0];
      matches.push({
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        listingId,
        displayName,
        fullUrl,
      });
    }

    // Second pass: process matches and handle display name replacement
    for (let i = 0; i < matches.length; i++) {
      const { matchStart, matchEnd, listingId, displayName, fullUrl } = matches[i];

      // Check if display name appears in text before the URL
      if (displayName && matchStart > lastIndex) {
        const textBefore = text.substring(lastIndex, matchStart);
        const displayNameIndex = textBefore.lastIndexOf(displayName);

        if (displayNameIndex !== -1) {
          // Display name found before URL - replace it with link
          // Add text before display name
          if (displayNameIndex > 0) {
            segments.push({
              type: 'text',
              content: textBefore.substring(0, displayNameIndex),
            });
          }

          // Add link for display name
          segments.push({
            type: 'link',
            content: displayName,
            url: fullUrl,
            listingId,
            displayName,
          });

          // Add text between display name and URL (excluding the URL itself)
          const textAfterDisplayName = textBefore.substring(displayNameIndex + displayName.length);
          if (textAfterDisplayName.trim()) {
            segments.push({
              type: 'text',
              content: textAfterDisplayName,
            });
          }

          lastIndex = matchEnd;
          continue;
        }
      }

      // No display name replacement needed - add text before URL and then the link
      if (matchStart > lastIndex) {
        segments.push({
          type: 'text',
          content: text.substring(lastIndex, matchStart),
        });
      }

      segments.push({
        type: 'link',
        content: displayName || `Market Listing ${listingId.substring(0, 8)}...`,
        url: fullUrl,
        listingId,
        displayName: displayName || undefined,
      });

      lastIndex = matchEnd;
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
    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === 'link') {
          return (
            <a
              key={index}
              href={segment.url}
              onClick={(e) => handleLinkClick(e, segment.url!)}
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
        }
        return <span key={index}>{segment.content}</span>;
      })}
    </div>
  );
}
