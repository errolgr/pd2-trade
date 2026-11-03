import { ExternalLink } from 'lucide-react';
import { Button } from '@pd2-trader/ui';
import { openUrl } from '@/lib/browser-opener';
import { trackEvent } from '@/lib/telemetry';
import { showToast } from '@/overlay';
import { siteSearchLink } from '@/pages/market/lib/site-url';
import type { MarketFilters } from '@/pages/market/lib/types';
import { useTranslation } from '@/i18n';

/**
 * Opens the current search on projectdiablo2.com (Trade, or Archive for sold listings). Filters the site link
 * can't carry are named in the tooltip and in a toast on click.
 */
export function OpenOnSiteButton({ filters }: { filters: MarketFilters | null }) {
  const { t } = useTranslation('market');
  const link = filters ? siteSearchLink(filters) : null;
  const label = !link?.dropped.length
    ? t('openOnSite.label')
    : t('openOnSite.labelDropped', { dropped: link.dropped.join(', ') });

  const open = () => {
    if (!link) return;
    void openUrl(link.url);
    trackEvent('market_search_opened_on_site', { dropped_filters: link.dropped.length });
    if (link.dropped.length) {
      showToast({
        title: t('openOnSite.toastTitle'),
        description: t('openOnSite.toastDescription', { dropped: link.dropped.join(', ') }),
        variant: 'info',
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-xs"
      aria-label={label}
      title={label}
      disabled={!link}
      onClick={open}
      className="shrink-0 bg-background/40 text-muted-foreground shadow-none hover:border-input hover:text-foreground disabled:pointer-events-auto disabled:cursor-not-allowed"
    >
      <ExternalLink className="size-3.5" />
    </Button>
  );
}
