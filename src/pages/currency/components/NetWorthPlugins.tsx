import React from 'react';
import { ErrorChip, PriceTag, SlotText } from '@pd2-trader/ui';
import type { Valuation } from '@/lib/networth-api';
import { toNetWorthSummary } from '@/plugins/adapters/net-worth';
import { runPluginCommand, usePluginSlot } from '@/plugins/ui/hooks';
import { UiTree } from '@pd2-trader/plugin-sdk/react';
import { useStableSlotResults } from '@/plugins/ui/useStableSlotResults';

/** A plugin's tab in the net worth window: after the core tabs. */
export type PluginTabValue = `plugin:${string}`;

export interface PluginTab {
  value: PluginTabValue;
  label: string;
  content: React.ReactNode;
}

/**
 * B4: `networth.tab` tabs and `networth.metric` header metrics for the latest valuation. Asked again for each
 * new snapshot; a plugin being asked again keeps its previous tab/metric (no flicker, the selected tab stays).
 * Nothing is built or called without a running plugin implementing the slot.
 */
export function useNetWorthPlugins(valuation: Valuation | null): { tabs: PluginTab[]; metrics: React.ReactNode } {
  const input = valuation ? () => toNetWorthSummary(valuation) : null;
  const key = valuation
    ? `${valuation.account}|${valuation.isLadder}|${valuation.isHardcore}|${valuation.takenAt}`
    : '';
  const tabSlot = usePluginSlot('networth.tab', input, key);
  const metricSlot = usePluginSlot('networth.metric', input, key);
  const tabResults = useStableSlotResults(tabSlot.results);
  const metricResults = useStableSlotResults(metricSlot.results);

  const tabs = tabResults.flatMap((r): PluginTab[] => {
    const value: PluginTabValue = `plugin:${r.pluginId}`;
    if (r.state === 'error') {
      return [
        {
          value,
          label: r.pluginName,
          content: <ErrorChip message={`${r.pluginName}: ${r.error}`}
            onRetry={tabSlot.retry} />,
        },
      ];
    }
    if (r.state !== 'ok' || !r.value) return [];
    return [
      {
        value,
        label: r.value.title,
        content: (
          <div className="flex flex-col gap-2">
            <UiTree
              nodes={r.value.content}
              onCommand={(commandId, args) => runPluginCommand(r.pluginId, commandId, args)}
            />
          </div>
        ),
      },
    ];
  });

  const metrics = metricResults.flatMap((r) => {
    if (r.state === 'error')
      return [<ErrorChip key={r.pluginId}
        message={`${r.pluginName}: ${r.error}`}
        onRetry={metricSlot.retry} />];
    if (r.state !== 'ok' || !r.value) return [];
    const { label, value } = r.value;
    return [
      <span key={r.pluginId}
        className="inline-flex items-center gap-1">
        {label}
        {value.type === 'price' ? (
          <PriceTag amount={value.amount}
            unit={value.unit}
            trend={value.trend} />
        ) : (
          <SlotText text={value.text}
            tone={value.tone}
            size={value.size} />
        )}
      </span>,
    ];
  });

  return { tabs, metrics: metrics.length > 0 ? metrics : null };
}
