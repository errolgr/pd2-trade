import React, { useEffect, useState } from "react"
import ListItemShortcutForm from "./components/ListItemShortcut"
import { useSearchParams } from "react-router-dom";
import { Item as PriceCheckItem } from "../price-check/lib/interfaces";
import { OptionsProvider } from "@/hooks/useOptions";


export const QuickListPage: React.FC<any> = () => {
    const [item, setItem] = useState<PriceCheckItem>(null);
    const [searchParams] = useSearchParams();
    
    useEffect(() => {
        const param = searchParams.get("item");
        if (!param) return;
    
        try {
          const json = JSON.parse(atob(decodeURIComponent(param)));
          setItem(json);
          console.log('QuickListPage json' + json);
        } catch (err) {
          console.error("[QuickListPage] Failed to parse initial payload:", err);
        }
      }, [searchParams]);

    return (
        <OptionsProvider>
            {item && <ListItemShortcutForm item={item}></ListItemShortcutForm>}
        </OptionsProvider>
    )
}