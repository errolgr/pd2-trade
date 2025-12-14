import React, { useEffect, useState } from 'react';
import ListItemShortcutForm from './components/ListItemShortcut';
import { useSearchParams } from 'react-router-dom';
import { Item as PriceCheckItem } from '../price-check/lib/interfaces';
import { OptionsProvider } from '@/hooks/useOptions';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { listen } from '@/lib/browser-events';
import { ItemsProvider } from '@/hooks/useItems';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

// Simple unescape function to handle Unicode characters
const unescapeUnicode = (str: string): string => {
  return decodeURIComponent(escape(str));
};

import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// ...

export const QuickListPage: React.FC<any> = () => {
  const [item, setItem] = useState<PriceCheckItem>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const param = searchParams.get('item');
    const errorParam = searchParams.get('error');

    if (errorParam === 'not_shared_stash') {
      setTimeout(() => {
        toast.error('Cannot List Item', {
          description: 'This item is not in your shared stash and cannot be listed.',
          duration: 5000,
        });
      }, 500); // Small delay to ensure window is visible
      setItem(null);
    } else if (param) {
      try {
        const json = JSON.parse(unescapeUnicode(atob(decodeURIComponent(param))));
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
          toast.error('Cannot List Item', {
            description: 'This item is not in your shared stash and cannot be listed.',
            duration: 5000,
          });
          setItem(null);
        }
      };

      // Global listener
      const unlistenGlobal = await listen<string>('quick-list-new-item', ({ payload }) => handler(payload));
      const unlistenErrorGlobal = await listen<string>('quick-list-error', ({ payload }) => errorHandler(payload));

      // Window-specific listener (for when emitted directly to this window)
      let unlistenWindow: (() => void) | undefined;
      let unlistenWindowError: (() => void) | undefined;
      try {
        const appWindow = getCurrentWebviewWindow();
        unlistenWindow = await appWindow.listen<string>('quick-list-new-item', ({ payload }) => handler(payload));
        unlistenWindowError = await appWindow.listen<string>('quick-list-error', ({ payload }) =>
          errorHandler(payload),
        );
      } catch {
        // Ignore if not in Tauri or fails
      }

      return () => {
        unlistenGlobal();
        unlistenErrorGlobal();
        if (unlistenWindow) unlistenWindow();
        if (unlistenWindowError) unlistenWindowError();
      };
    };

    const cleanupPromise = setupListeners();

    return () => {
      cleanupPromise.then((cleanup) => cleanup());
    };
  }, [searchParams]);

  return (
    <TooltipProvider>
      <Toaster />
      <OptionsProvider>
        <ItemsProvider>
          <Pd2WebsiteProvider>
            <ListItemShortcutForm item={item} />
          </Pd2WebsiteProvider>
        </ItemsProvider>
      </OptionsProvider>
    </TooltipProvider>
  );
};
