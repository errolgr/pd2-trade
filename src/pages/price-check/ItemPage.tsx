import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import ItemOverlayWidget from "@/pages/price-check/components/ItemOverlayWidget";
import {OptionsProvider} from "@/hooks/useOptions";

const ItemWindow: React.FC = () => {
  const [item, setItem] = useState<any>(null);
  const [searchParams] = useSearchParams();
  /* ---------------------------------
   * Parse the ?text param on first load
   * --------------------------------- */
  useEffect(() => {
    const param = searchParams.get("text");
    console.log("[ItemWindow] Initial ?text param:", param);

    if (!param) return;

    try {
      const json = JSON.parse(atob(decodeURIComponent(param)));
      console.log("[ItemWindow] Parsed initial JSON:", json);
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
      console.log("[ItemWindow] new-search payload:", payload);
      try {
        const json = JSON.parse(atob(decodeURIComponent(payload)));
        console.log("[ItemWindow] Parsed JSON from new-search:", json);
        setItem(json);
      } catch (err) {
        console.error("[ItemWindow] Failed to parse new-search payload:", err);
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
      <ItemOverlayWidget item={item}
        onClose={() => getCurrentWebviewWindow().close()} />
    </OptionsProvider>
   
  );
};

export default ItemWindow;
