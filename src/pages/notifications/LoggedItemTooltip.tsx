import React from 'react';
import { PopoverKeyValue } from '@/components/custom/popover-parts';
import { useTranslation } from '@/i18n';
import type { LoggedItem } from '@/lib/notification-log';
import { cn } from '@/lib/utils';
import { stashPlace } from '@/pages/chat/components/ListingCard';
import { ItemTooltip } from '@/pages/market/components/ItemTooltip';

/**
 * A logged listing's item as it was (an auto-delisted one): the in-game tooltip, then the listing's price and note
 * and where the item lay when it was listed, to find it in the stash and list it again.
 */
export function LoggedItemTooltip({ item: logged, className }: { item: LoggedItem; className?: string }) {
  const { t } = useTranslation('chat');
  const { item, hrPrice, note } = logged;
  const place = stashPlace(item);
  return (
    <div className={cn('w-72 space-y-1.5 text-left', className)}>
      <ItemTooltip item={item} />
      {(hrPrice > 0 || note || place) && (
        <div className="space-y-1 px-1 text-xs">
          {hrPrice > 0 && <PopoverKeyValue label={t('listing.price')}>{`${hrPrice} HR`}</PopoverKeyValue>}
          {note && (
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">{t('listing.note')}</span>
              <span className="min-w-0 break-words text-right">{note}</span>
            </div>
          )}
          {place && <PopoverKeyValue label={t('app:notificationLog.listedFrom')}>{place}</PopoverKeyValue>}
        </div>
      )}
    </div>
  );
}
