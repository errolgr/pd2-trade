import React, { useEffect, useState } from 'react';
import ListItemShortcutForm from './components/ListItemShortcut';
import { Item as PriceCheckItem } from '../price-check/lib/interfaces';
import { TooltipProvider } from '@/components/ui/tooltip';
import { listen } from '@/lib/browser-events';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';

// Simple unescape function to handle Unicode characters
const unescapeUnicode = (str: string): string => {
  return decodeURIComponent(escape(str));
};

export const QuickListPage: React.FC<any> = () => {
  const [item, setItem] = useState<PriceCheckItem>(null);
  const { getView } = useViewManager();
  const view = getView(VIEW_IDS.QUICK_LIST);

  useEffect(() => {
    // Get initial data from view manager
    if (view?.data?.error === 'not_shared_stash') {
      setItem(null);
    } else if (view?.data?.encodedItem) {
      try {
        const json = JSON.parse(unescapeUnicode(atob(decodeURIComponent(view.data.encodedItem))));
        setItem(json);
      } catch (err) {
        console.error('[QuickListPage] Failed to parse initial payload:', err);
        setItem(null);
      }
    } else {
      setItem(null);
    }
    // Listen for quick-list-new-item events (global and window-specific)
    const setupListeners = async () => {
      const handler = (payload: string | null) => {
        try {
          if (!payload) {
            setItem(null);
            return;
          }
          const json = JSON.parse(unescapeUnicode(atob(decodeURIComponent(payload))));
          setItem(json);
        } catch (err) {
          console.error('[QuickListPage] Failed to parse event payload:', err);
          setItem(null);
        }
      };

      const errorHandler = (payload: string) => {
        if (payload === 'not_shared_stash') {
          // Toast handled globally by LandingPage
          // Just clear the item state here
          setItem(null);
        }
      };

      // Global listener
      const unlistenGlobal = await listen<string>('quick-list-new-item', ({ payload }) => handler(payload));
      const unlistenErrorGlobal = await listen<string>('quick-list-error', ({ payload }) => errorHandler(payload));

      return () => {
        unlistenGlobal();
        unlistenErrorGlobal();
      };
    };

    const cleanupPromise = setupListeners();

    return () => {
      cleanupPromise.then((cleanup) => cleanup());
    };
  }, [view?.data]);

  return (
    <TooltipProvider>
      <div className="h-full w-full overflow-hidden bg-transparent">
        <ListItemShortcutForm item={item} />
      </div>
    </TooltipProvider>
  );
};
