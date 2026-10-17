import { useEffect, useMemo, useState } from 'react';
import { fetchRareAppraisal, type RareAppraisalResponse } from '@/lib/rare-appraisal-api';
import { reportApiError } from '@/lib/error-reporting';
import { incrementMetric } from '@/lib/sentryMetrics';
import { ItemQuality } from '@/common/types/Item';
import type { Item } from '../lib/interfaces';

export type RareAppraisalState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** Feature off on the server (404). */
  | { status: 'off' }
  | { status: 'error' }
  | { status: 'done'; response: RareAppraisalResponse };

/**
 * Appraises a Rare price-check item on pd2trader.com (`POST /api/rare-appraisal`) with the captured item
 * (the PD2 clipboard JSON, re-serialised). `mode === null` (settings still loading) or a non-rare item: idle.
 */
export function useRareAppraisal(
  item: Item,
  mode: { isLadder: boolean; isHardcore: boolean } | null,
): RareAppraisalState {
  const text = useMemo(() => (item.quality === ItemQuality.Rare ? JSON.stringify(item) : null), [item]);
  const isLadder = mode?.isLadder;
  const isHardcore = mode?.isHardcore;
  const requestKey = text !== null && mode ? `${isLadder}|${isHardcore}|${text}` : null;
  const [settled, setSettled] = useState<{ key: string; state: RareAppraisalState } | null>(null);

  useEffect(() => {
    if (requestKey === null || text === null || isLadder === undefined || isHardcore === undefined) return;
    const controller = new AbortController();
    let cancelled = false;
    const settle = (state: RareAppraisalState) => {
      if (!cancelled) setSettled({ key: requestKey, state });
    };
    fetchRareAppraisal(text, { isLadder, isHardcore }, controller.signal).then(
      (response) => {
        if (!response) return settle({ status: 'off' });
        incrementMetric('item_overlay.rare_appraisal', 1, { verdict: response.appraisal?.verdict ?? 'none' });
        settle({ status: 'done', response });
      },
      (err: unknown) => {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        reportApiError(error, 'rare-appraisal-api', 'api/rare-appraisal');
        settle({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [requestKey, text, isLadder, isHardcore]);

  if (requestKey === null) return { status: 'idle' };
  return settled?.key === requestKey ? settled.state : { status: 'loading' };
}
