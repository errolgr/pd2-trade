import React, { useMemo } from 'react';
import ListItemShortcutForm from './components/ListItemShortcut';
import { Item as PriceCheckItem } from '../price-check/lib/interfaces';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePanel } from '@/overlay';

export const QuickListPage: React.FC = () => {
  const { payload, payloadVersion } = usePanel<'quickList'>();

  // Each openPanel('quickList', ...) delivers a new payload (payloadVersion bumps even for the same item):
  // { item } lists it; { error }, undefined (manage mode) or an undecodable item show no item.
  const item = useMemo<PriceCheckItem | null>(() => {
    if (!payload?.item || payload.error === 'not_shared_stash') return null;
    try {
      // encodeItemForQuickList(): base64 of the URI-encoded UTF-8 JSON
      return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(payload.item)))));
    } catch (err) {
      console.error('[QuickListPage] Failed to parse item payload:', err);
      return null;
    }
    // payloadVersion: a re-sent identical payload still yields a fresh item (the form resets as before)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, payloadVersion]);

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-hidden bg-transparent">
        <ListItemShortcutForm item={item} />
      </div>
    </TooltipProvider>
  );
};
