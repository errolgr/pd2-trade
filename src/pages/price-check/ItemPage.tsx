import React, { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import ItemOverlayWidget from '@/pages/price-check/components/ItemOverlayWidget';
import type { Item } from '@/pages/price-check/lib/interfaces';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { usePanel } from '@/overlay';
import { useTranslation } from '@/i18n';

const ItemWindow: React.FC = () => {
  const { t } = useTranslation('priceCheck');
  const { payload, payloadVersion, close } = usePanel<'itemSearch'>();
  const [search, setSearch] = useState<{ version: number; item: Item | null }>({ version: 0, item: null });

  // Every price-check hotkey press reopens the panel with a new payload (payloadVersion bumps even for the same item).
  // A payload that cannot be decoded keeps the current item.
  if (search.version !== payloadVersion) {
    let next = search.item;
    if (payload?.text) {
      try {
        // encodeItem(): base64 of the URI-encoded UTF-8 JSON
        next = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(payload.text)))));
      } catch (err) {
        console.error('[ItemWindow] Failed to parse item payload:', err);
      }
    }
    setSearch({ version: payloadVersion, item: next });
  }
  const { item } = search;

  return !item ? (
    <WindowPanel animate
      className="h-full w-full">
      <WindowChrome
        title={t('overlay.title')}
        titleClassName="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground"
        showGrip={false}
        onClose={close}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
          <PackageSearch className="size-6" />
        </div>
        <p className="max-w-[260px] text-sm text-muted-foreground">{t('itemPage.noItem')}</p>
        <p className="max-w-[260px] text-xs text-muted-foreground/80">{t('itemPage.noItemHint')}</p>
      </div>
    </WindowPanel>
  ) : (
    <ItemOverlayWidget item={item}
      onClose={close} />
  );
};

export default ItemWindow;
