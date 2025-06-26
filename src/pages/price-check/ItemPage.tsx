import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import ItemOverlayWidget from "@/pages/price-check/components/ItemOverlayWidget";
import {OptionsProvider} from "@/hooks/useOptions";
import { ItemsProvider } from "@/hooks/useItems";
import { Pd2WebsiteProvider } from "@/hooks/pd2website/usePD2Website";

const ItemWindow: React.FC = () => {
  const [item, setItem] = useState<any>(null);
  const [searchParams] = useSearchParams();
  /* ---------------------------------
   * Parse the ?text param on first load
   * --------------------------------- */
  useEffect(() => {
    const param = searchParams.get("text");
    if (!param) return;

    try {
      const json = JSON.parse(atob(decodeURIComponent(param)));
      setItem(json);
    } catch (err) {
      console.error("[ItemWindow] Failed to parse initial payload:", err);
    }
  }, [searchParams]);

  /* ---------------------------------
   * Listen for new-search events
   * --------------------------------- */
  useEffect(() => {
    const unlistenPromise = listen<string>("new-search", ({ payload }) => {
      try {
        const json = JSON.parse(atob(decodeURIComponent(payload)));
        setItem(json);
      } catch (err) {
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  if (!item) {
    return (
      <div className="text-center text-gray-500">
        No item data provided or failed to parse.
      </div>
    );
  }

  return (
    <OptionsProvider>
      <ItemsProvider>
        <Pd2WebsiteProvider>
          <ItemOverlayWidget item={item}
            onClose={() => getCurrentWebviewWindow().hide()} />
        </Pd2WebsiteProvider>
      </ItemsProvider>
    </OptionsProvider>
   
  );
};

export default ItemWindow;
