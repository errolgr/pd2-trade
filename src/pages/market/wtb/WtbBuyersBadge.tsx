import React from 'react';
import { HandCoins } from 'lucide-react';
import { Tip } from '@/components/ui/tooltip';
import { useOverlay } from '@/overlay';
import { useTranslation } from '@/i18n';
import { byBestOffer, formatOffer, type WtbItemMatch } from '../lib/wtb';

/**
 * "{n} buyers" on one of the user's own listings that open buy requests match; a click opens the best request in
 * the market's Wanted drawer. Nothing without a match.
 */
export function WtbBuyersBadge({
  matches,
  item,
}: {
  matches: readonly WtbItemMatch[] | undefined;
  /** The listing's item: a contact from the drawer tells the buyer about it. */
  item: object;
}) {
  return matches?.length ? <Badge matches={matches}
    item={item} /> : null;
}

function Badge({ matches, item }: { matches: readonly WtbItemMatch[]; item: object }) {
  const { t } = useTranslation('market');
  const { openPanel } = useOverlay();
  const best = [...matches].sort(byBestOffer)[0];
  const label = t('wtb.badge.tooltip', { name: best.request.buyer.name, offer: formatOffer(best.request.offer) });
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={() => openPanel('market', { wanted: { match: best, item } }, { focus: true })}
        className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded-full border border-success/40 bg-success/10 px-1.5 text-[10px] font-semibold text-success outline-none transition-colors duration-(--dur-fast) hover:bg-success/20 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <HandCoins className="size-2.5" />
        {t('wtb.badge.buyers', { count: matches.length })}
      </button>
    </Tip>
  );
}
