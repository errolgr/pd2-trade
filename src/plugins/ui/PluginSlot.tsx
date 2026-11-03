import React from 'react';
import type { SlotInput } from '@pd2-trader/plugin-sdk';
import { ErrorChip, SlotBadge, SlotSkeleton } from './slot-components';
import { UiTree } from './UiTree';
import { runPluginCommand, usePluginSlot } from './hooks';

/**
 * Ready-made outlets for the common slot shapes. Surfaces with their own layout (market columns, chat tags,
 * net worth tabs) call `usePluginSlot` directly and render with the same slot components.
 */

/** `priceCheck.section`: one section per plugin, skeleton while pending, error chip on failure. */
export function PriceCheckSections({ input, inputKey }: { input: (() => SlotInput<'priceCheck.section'>) | null; inputKey: string }) {
  const { results, retry } = usePluginSlot('priceCheck.section', input, inputKey);
  if (!results.length) return null;
  return (
    <div className="flex flex-col gap-1.5"
      data-plugin-slot="priceCheck.section">
      {results.map((r) =>
        r.state === 'loading' ? (
          <SlotSkeleton key={r.pluginId} />
        ) : r.state === 'error' ? (
          <ErrorChip key={r.pluginId}
            message={`${r.pluginName}: ${r.error}`}
            onRetry={retry} />
        ) : r.value ? (
          <UiTree key={r.pluginId}
            nodes={[r.value]}
            onCommand={(commandId, args) => runPluginCommand(r.pluginId, commandId, args)} />
        ) : null,
      )}
    </div>
  );
}

/** `priceCheck.badge`: inline badges after the item name; pending and failed plugins render nothing inline. */
export function PriceCheckBadges({ input, inputKey }: { input: (() => SlotInput<'priceCheck.badge'>) | null; inputKey: string }) {
  const { results } = usePluginSlot('priceCheck.badge', input, inputKey);
  return (
    <>
      {results.map((r) =>
        r.state === 'ok' && r.value ? <SlotBadge key={r.pluginId}
          text={r.value.text}
          tone={r.value.tone} /> : null,
      )}
    </>
  );
}
