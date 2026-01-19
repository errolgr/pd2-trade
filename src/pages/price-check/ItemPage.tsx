import React, { useEffect, useState } from 'react';
import { listen } from '@/lib/browser-events';
import ItemOverlayWidget from '@/pages/price-check/components/ItemOverlayWidget';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useOptions } from '@/hooks/useOptions';
import { formatHotkey } from '@/lib/hotkey-format';

// Simple unescape function to handle Unicode characters
const unescapeUnicode = (str: string): string => {
  return decodeURIComponent(escape(str));
};

const ItemWindow: React.FC = () => {
  const [item, setItem] = useState<any>(null);
  const { hideView, getView } = useViewManager();
  const { settings } = useOptions();
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

  if (!item) {
    return (
      <Card className="w-full h-full shadow-2xl bg-neutral-900/95 border-neutral-700 rounded-none flex flex-col">
        <div className="flex items-center justify-between border-neutral-700 bg-neutral-800/50 flex-none px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Item Price Check</h2>
          </div>
        </div>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground opacity-50" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-white">No Item Selected</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Hover over an item in-game and use the price check shortcut (
              {settings?.hotkeyKey ? formatHotkey(settings.hotkeyModifier || 'ctrl', settings.hotkeyKey) : 'Ctrl+D'}) to
              view item pricing information.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <ItemOverlayWidget item={item}
    onClose={() => hideView(VIEW_IDS.ITEM_SEARCH)} />;
};

export default ItemWindow;
