import { ExternalLink } from 'lucide-react';
import { openUrl } from '@/lib/browser-opener';
import { showToast } from '@/overlay';
import { siteSearchLink } from '@/pages/market/lib/site-url';
import type { MarketFilters } from '@/pages/market/lib/types';

/**
 * Opens the current search on projectdiablo2.com (Trade, or Archive for sold listings). Filters the site link
 * can't carry are named in the tooltip and in a toast on click.
 */
export function OpenOnSiteButton({ filters }: { filters: MarketFilters | null }) {
  const link = filters ? siteSearchLink(filters) : null;
  const label = !link?.dropped.length
    ? 'Open this search on projectdiablo2.com'
    : `Open this search on projectdiablo2.com (the site can't filter by: ${link.dropped.join(', ')})`;

  const open = () => {
    if (!link) return;
    void openUrl(link.url);
    if (link.dropped.length) {
      showToast({
        title: 'Opened on projectdiablo2.com',
        description: `Not included, the site can't filter by: ${link.dropped.join(', ')}.`,
        variant: 'info',
      });
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!link}
      onClick={open}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-input bg-background/40 text-muted-foreground outline-none transition-[color,background-color,border-color] duration-(--dur-fast) hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ExternalLink className="size-3.5" />
    </button>
  );
}
