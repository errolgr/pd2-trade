import React, { useEffect, useState } from "react"
import ListItemShortcutForm from "./components/ListItemShortcut"
import { useSearchParams } from "react-router-dom";
import { Item as PriceCheckItem } from "../price-check/lib/interfaces";
import { OptionsProvider } from "@/hooks/useOptions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Pd2WebsiteProvider } from "@/hooks/pd2website/usePD2Website";
import { listen } from '@tauri-apps/api/event';

// Safe decoding function that handles Unicode characters
const safeDecode = (encoded: string): string => {
  return decodeURIComponent(atob(encoded));
};

export const QuickListPage: React.FC<any> = () => {
    const [item, setItem] = useState<PriceCheckItem>(null);
    const [searchParams] = useSearchParams();
    
    useEffect(() => {
        const param = searchParams.get("item");
        if (param) {
          try {
            const json = JSON.parse(safeDecode(param));
            setItem(json);
            console.log('QuickListPage json' + json);
          } catch (err) {
            console.error("[QuickListPage] Failed to parse initial payload:", err);
          }
        }
        // Listen for quick-list-new-item events
        const unlistenPromise = listen<string>('quick-list-new-item', ({ payload }) => {
          try {
            const json = JSON.parse(safeDecode(payload));
            setItem(json);
          } catch (err) {
            console.error('[QuickListPage] Failed to parse event payload:', err);
          }
        });
        return () => {
          unlistenPromise.then((unlisten) => unlisten());
        };
      }, [searchParams]);

    return (
      <TooltipProvider>
        <OptionsProvider>
          <Pd2WebsiteProvider>
            {item && <ListItemShortcutForm item={item}></ListItemShortcutForm>}
          </Pd2WebsiteProvider>
        </OptionsProvider>
      </TooltipProvider>
    )
}