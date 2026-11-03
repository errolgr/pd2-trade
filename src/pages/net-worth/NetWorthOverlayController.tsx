import React, { useEffect, useRef } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { isToastEnabled } from '@/hooks/useSocketNotifications';
import type { SnapshotResponse, ValuationLine } from '@/lib/networth-api';
import type { GenericToastPayload } from '@/common/types/Events';
import { showToast, useOverlay } from '@/overlay';
import { formatSignedHr } from './overlay';
import { t } from '@/i18n';

/**
 * Names the holdings that moved the most between two valuations, in the direction of the total change,
 * e.g. `Ber, 2× Ist`.
 */
function describeTopChanges(previous: ValuationLine[], next: ValuationLine[], gained: boolean): string {
  const qtyBefore = new Map(previous.map((line) => [line.key, line.qty]));
  const changes = new Map<string, { name: string; qtyDelta: number; valueDelta: number }>();
  const nextKeys = new Set<string>();
  for (const line of next) {
    nextKeys.add(line.key);
    const qtyDelta = line.qty - (qtyBefore.get(line.key) ?? 0);
    if (qtyDelta !== 0)
      changes.set(line.key, { name: line.name, qtyDelta, valueDelta: qtyDelta * (line.unitPrice ?? 0) });
  }
  for (const line of previous) {
    if (!nextKeys.has(line.key)) {
      changes.set(line.key, { name: line.name, qtyDelta: -line.qty, valueDelta: -line.value });
    }
  }
  return [...changes.values()]
    .filter((c) => (gained ? c.valueDelta > 0 : c.valueDelta < 0))
    .sort((a, b) => Math.abs(b.valueDelta) - Math.abs(a.valueDelta))
    .slice(0, 3)
    .map((c) => (Math.abs(c.qtyDelta) === 1 ? c.name : `${Math.abs(c.qtyDelta)}× ${c.name}`))
    .join(', ');
}

/**
 * App-level net worth overlay behaviour (renders nothing): shows the ticker panel while it is turned on and the
 * user is signed in (the panel itself hides with the game), and toasts notable snapshot changes.
 */
const NetWorthOverlayController: React.FC = () => {
  const { settings } = useOptions();
  const { latest } = useNetWorth();
  const { openPanel, closePanel } = useOverlay();
  const previousLatestRef = useRef<SnapshotResponse | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Snapshot toast: persisted, non-deduped snapshot whose change crosses the threshold. Only while the ticker is
  // on, so history saving in the background (on by default) shows nothing until the player opts into the overlay.
  useEffect(() => {
    const previous = previousLatestRef.current;
    previousLatestRef.current = latest;
    if (!latest || latest === previous || !latest.snapshotId || latest.deduped) return;

    const change = latest.delta.sincePrevious;
    const threshold = settingsRef.current.netWorthToastThresholdHr ?? 0.5;
    if (change === null || Math.abs(change) < threshold) return;
    if (settingsRef.current.netWorthTickerEnabled !== true || !isToastEnabled(settingsRef.current, 'networth')) return;

    const movers = previous ? describeTopChanges(previous.valuation.lines, latest.valuation.lines, change > 0) : '';
    const payload: GenericToastPayload = {
      title: t('netWorth:toast.title'),
      description: movers
        ? t('netWorth:toast.changeWithMovers', { change: formatSignedHr(change), movers })
        : t('netWorth:toast.change', { change: formatSignedHr(change) }),
      variant: change > 0 ? 'success' : 'warning',
    };
    showToast(payload);
  }, [latest]);

  // Ticker: off until turned on in Settings → Net Worth, and only while signed in
  const tickerWanted = settings.netWorthTickerEnabled === true && !!settings.pd2Token;
  useEffect(() => {
    if (tickerWanted) openPanel('netWorthTicker');
    else closePanel('netWorthTicker');
  }, [tickerWanted, openPanel, closePanel]);

  return null;
};

export default NetWorthOverlayController;
