import React, { useEffect, useState } from 'react';
import { listen } from '@/lib/browser-events';
import ItemOverlayWidget from '@/pages/price-check/components/ItemOverlayWidget';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';

// Simple unescape function to handle Unicode characters
const unescapeUnicode = (str: string): string => {
  return decodeURIComponent(escape(str));
};

const ItemWindow: React.FC = () => {
  const [item, setItem] = useState<any>(null);
  const { hideView, getView } = useViewManager();
  const view = getView(VIEW_IDS.ITEM_SEARCH);

  /* ---------------------------------
   * Parse the item data from view manager
   * --------------------------------- */
  useEffect(() => {
    if (!view?.data?.itemText && !view?.data?.encoded) return;

    const encoded = view.data.itemText || view.data.encoded;
    try {
      const json = JSON.parse(unescapeUnicode(atob(decodeURIComponent(encoded))));
      setItem(json);
    } catch (err) {
      console.error('[ItemWindow] Failed to parse initial payload:', err);
    }
  }, [view?.data]);

  /* ---------------------------------
   * Listen for new-search events
   * --------------------------------- */
  useEffect(() => {
    const unlistenPromise = listen<string>('new-search', ({ payload }) => {
      try {
        const json = JSON.parse(unescapeUnicode(atob(decodeURIComponent(payload))));
        setItem(json);
      } catch {
        // Ignore parse errors
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <>
      {!item ? (
        <div className="text-center text-gray-500">No item data provided or failed to parse.</div>
      ) : (
        <ItemOverlayWidget item={item}
          onClose={() => hideView(VIEW_IDS.ITEM_SEARCH)} />
      )}
    </>
  );
};

export default ItemWindow;
