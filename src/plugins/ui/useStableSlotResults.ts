import { useState } from 'react';
import type { CallableSlotId } from '@pd2-trader/plugin-sdk';
import type { SlotResult } from './hooks';

/**
 * `usePluginSlot` results where a plugin that is being asked again keeps showing its previous value instead
 * of `loading`, so surfaces that re-call a slot (new snapshot, periodic refresh) don't flicker or lose a
 * selected plugin tab. Errors replace the previous value.
 */
export function useStableSlotResults<S extends CallableSlotId>(results: SlotResult<S>[]): SlotResult<S>[] {
  const [previous, setPrevious] = useState({ results, stable: results });
  if (previous.results === results) return previous.stable;
  const lastOk = new Map(previous.stable.filter((r) => r.state === 'ok').map((r) => [r.pluginId, r]));
  const stable = results.map((r) => (r.state === 'loading' ? (lastOk.get(r.pluginId) ?? r) : r));
  // Adjusting state while rendering (React's "previous render" pattern): re-renders before committing
  setPrevious({ results, stable });
  return stable;
}
