import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { listen } from '@/lib/browser-events';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import ItemOverlayWidget from '@/pages/price-check/components/ItemOverlayWidget';
import { OptionsProvider } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';

// Simple unescape function to handle Unicode characters
const unescapeUnicode = (str: string): string => {
  return decodeURIComponent(escape(str));
};

const ItemWindow: React.FC = () => {
  const [item, setItem] = useState<any>(null);
  const [searchParams] = useSearchParams();

  /* ---------------------------------
   * Parse the ?text param on first load
   * --------------------------------- */
  useEffect(() => {
    const param = searchParams.get('text');
    if (!param) return;

    try {
      const json = JSON.parse(unescapeUnicode(atob(decodeURIComponent(param))));
      setItem(json);
    } catch (err) {
      console.error('[ItemWindow] Failed to parse initial payload:', err);
    }
  }, [searchParams]);

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

  const hideWindow = () => getCurrentWebviewWindow().hide();

  return (
    <OptionsProvider>
      <ItemsProvider>
        <ChildPd2WebsiteProvider>
          {!item ? (
            <WindowPanel animate
              className="h-screen w-screen">
              <WindowChrome title="Price Check"
                titleClassName="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
                showGrip={false}
                onClose={hideWindow} />
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
                  <PackageSearch className="size-6" />
                </div>
                <p className="max-w-[260px] text-sm text-muted-foreground">No item data provided or failed to parse.</p>
                <p className="max-w-[260px] text-xs text-muted-foreground/80">
                  Hover an item in game and press your price check hotkey to try again.
                </p>
              </div>
            </WindowPanel>
          ) : (
            <ItemOverlayWidget item={item}
              onClose={hideWindow} />
          )}
        </ChildPd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
  );
};

export default ItemWindow;
