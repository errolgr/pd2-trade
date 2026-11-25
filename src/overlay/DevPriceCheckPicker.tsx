import { useState } from 'react';
import { clipboardContainsValidItem, encodeItem } from '@/lib/item-utils';
import { DEV_PRICE_CHECK_SAMPLES } from './dev-samples';
import { useOverlay } from './OverlayProvider';
import { showToast } from './toast';

const FROM_CLIPBOARD = 'clipboard';

/**
 * Browser test harness (dev builds outside Tauri): price-check a sample item, or the item JSON on the clipboard
 * (copy an item in game, then pick "From clipboard"), as if it were copied in game. Rendered by OverlayRoot.
 */
export function DevPriceCheckPicker() {
  const { openPanel } = useOverlay();
  // Back to the placeholder after each pick, so picking the same item again checks it again
  const [value, setValue] = useState('');

  const priceCheck = (raw: string) => openPanel('itemSearch', { text: encodeItem(raw) });

  const pick = async (choice: string) => {
    setValue('');
    if (choice !== FROM_CLIPBOARD) {
      priceCheck(JSON.stringify(DEV_PRICE_CHECK_SAMPLES[Number(choice)].item));
      return;
    }
    const raw = await navigator.clipboard.readText().catch(() => '');
    if (clipboardContainsValidItem(raw)) priceCheck(raw);
    else showToast({ title: 'Dev price check', description: 'The clipboard holds no item JSON', variant: 'error' });
  };

  return (
    <label className="pointer-events-auto fixed bottom-3 left-3 z-[9999] flex items-center gap-2 rounded-md border border-dashed border-border bg-popover/95 px-2.5 py-1.5 text-xs text-muted-foreground shadow-panel">
      <span className="font-semibold uppercase tracking-wider">Dev</span>
      <select
        aria-label="Price check a test item"
        value={value}
        onChange={(e) => void pick(e.target.value)}
        className="rounded border border-border bg-background px-1.5 py-1 text-foreground"
      >
        <option value=""
          disabled>
          Price check…
        </option>
        {DEV_PRICE_CHECK_SAMPLES.map((sample, i) => (
          <option key={sample.label}
            value={i}>
            {sample.label}
          </option>
        ))}
        <option value={FROM_CLIPBOARD}>From clipboard (item copied in game)</option>
      </select>
    </label>
  );
}
